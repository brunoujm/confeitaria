import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { validateVideoFile } from '@/lib/video-metadata';

/**
 * Cria o cliente Supabase de forma lazy (sob demanda).
 * Isso evita erros durante o build quando as variáveis de ambiente não estão disponíveis.
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Configuração do Supabase ausente. Verifique as variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, key);
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images

// Magic bytes signatures for validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, need to check WEBP at offset 8
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'video/mp4': [
    // ftyp box with major brands: isom, iso2, mp41, mp42, msnv, avc1, etc.
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4 (size=24)
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4 (size=28)
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4 (size=32)
  ],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4 (size=20)
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4 (size=24)
  ],
};

// Valid MP4 major brands (after ftyp)
const VALID_MP4_BRANDS = new Set([
  'isom', 'iso2', 'mp41', 'mp42', 'msnv', 'avc1', 'avc2', 'avc3', 'avc4',
  'qt  ', '3gp4', '3gp5', '3gp6', '3gp7', '3g2a', '3g2b', '3gr6', '3gr8',
  '3gr9', 'M4A ', 'M4V ', 'CAEP', 'F4V ', 'lmsg', 'msm1', 'msm2', 'msm3',
  'ndas', 'ndsc', 'ndsh', 'ndsm', 'ndsp', 'ndss', 'ndxc', 'ndxh', 'ndxm',
  'ndxp', 'opid', 'pana', 'prfa', 'prft', 'seau', 'senb', 'senc', 'simg',
  'subp', 'tx3g', 'vc-1', 'vttc', 'mp71', 'dash', 'dby1', 'dmb1', 'msdh',
  'msix', 'mslc', 'msmc', 'mspd', 'mssc', 'mste', 'ndac', 'ndas', 'ndsc',
  'ndsh', 'ndsm', 'ndsp', 'ndss', 'ndxc', 'ndxh', 'ndxm', 'ndxp', 'sbnk',
  'sbtl', 'sdio', 'sdir', 'sdtp', 'seln', 'sidx', 'sinf', 'skip', 'smhd',
  'soun', 'stbl', 'stco', 'stsc', 'stsd', 'stsh', 'stss', 'stsz', 'stts',
  'styp', 'strd', 'strk', 'subs', 'subt', 'sync', 'taps', 'tfra', 'tfdt',
  'tfhd', 'tfxd', 'tfxg', 'thmb', 'tkhd', 'tref', 'trep', 'trex', 'trgr',
  'trpy', 'tsel', 'txtc', 'udta', 'uuid', 'vlab', 'vmgm', 'vmhd', 'vpcC',
  'vttc', 'vvcC', 'wave', 'wvtt',
]);

// Valid WebM doctypes
const VALID_WEBM_DOCTYPES = new Set(['webm', 'matroska']);

// Valid MOV/QuickTime major brands
const VALID_MOV_BRANDS = new Set(['qt  ', 'moov', 'MDAT', 'FREE', 'SKIP', 'wide', 'load', 'imap', 'matt', 'kmat', 'clip', 'crgn', 'sync', 'chap', 'tmcd', 'scpt', 'ssrc', 'PICT', 'btrt']);

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) => {
    if (sig.length > buffer.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

// Enhanced MP4 validation - check for valid major brand after ftyp
function validateMP4(buffer: Buffer): boolean {
  if (buffer.length < 24) return false;
  // Check for ftyp box at offset 0 or 4
  let offset = 0;
  // Box size (4 bytes) + 'ftyp' (4 bytes)
  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > buffer.length) {
    // Try offset 4 (some files have a leading size field)
    if (buffer.length < 28) return false;
    const boxSize2 = buffer.readUInt32BE(4);
    if (boxSize2 < 16 || boxSize2 > buffer.length - 4) return false;
    if (buffer[8] !== 0x66 || buffer[9] !== 0x74 || buffer[10] !== 0x79 || buffer[11] !== 0x70) return false;
    offset = 12; // Skip size + 'ftyp'
  } else {
    if (buffer[4] !== 0x66 || buffer[5] !== 0x74 || buffer[6] !== 0x79 || buffer[7] !== 0x70) return false;
    offset = 8; // Skip size + 'ftyp'
  }
  // Major brand is 4 bytes at offset
  if (offset + 4 > buffer.length) return false;
  const majorBrand = String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]);
  return VALID_MP4_BRANDS.has(majorBrand);
}

// Enhanced WebM validation - check for valid doctype
function validateWebM(buffer: Buffer): boolean {
  if (buffer.length < 32) return false;
  // EBML header is 0x1A45DFA3 (4 bytes)
  if (buffer[0] !== 0x1A || buffer[1] !== 0x45 || buffer[2] !== 0xDF || buffer[3] !== 0xA3) return false;
  // Look for DocType element (0x4282) within first 1KB
  // Simple check: search for 'webm' or 'matroska' string in first 1KB
  const searchLimit = Math.min(buffer.length, 1024);
  const bufferStr = buffer.subarray(0, searchLimit).toString('binary');
  return bufferStr.includes('webm') || bufferStr.includes('matroska');
}

// Enhanced MOV/QuickTime validation
function validateMOV(buffer: Buffer): boolean {
  if (buffer.length < 24) return false;
  // Check for ftyp box
  let offset = 0;
  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > buffer.length) {
    if (buffer.length < 28) return false;
    const boxSize2 = buffer.readUInt32BE(4);
    if (boxSize2 < 16 || boxSize2 > buffer.length - 4) return false;
    if (buffer[8] !== 0x66 || buffer[9] !== 0x74 || buffer[10] !== 0x79 || buffer[11] !== 0x70) return false;
    offset = 12;
  } else {
    if (buffer[4] !== 0x66 || buffer[5] !== 0x74 || buffer[6] !== 0x79 || buffer[7] !== 0x70) return false;
    offset = 8;
  }
  if (offset + 4 > buffer.length) return false;
  const majorBrand = String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]);
  return VALID_MOV_BRANDS.has(majorBrand);
}

// Special handling for WebP (RIFF + WEBP at offset 8)
function validateWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // Check RIFF header
  if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46) return false;
  // Check WEBP at offset 8
  return buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validate file type by MIME
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use imagens (JPG, PNG, WebP, GIF) ou vídeos (MP4, WebM, MOV).' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${maxSize / (1024 * 1024)}MB para ${isImage ? 'imagens' : 'vídeos'}` },
        { status: 400 }
      );
    }

    // Read file buffer for magic bytes validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes with enhanced validators for video formats
    let magicBytesValid = false;
    if (file.type === 'image/webp') {
      magicBytesValid = validateWebP(buffer);
    } else if (file.type === 'video/mp4') {
      magicBytesValid = validateMP4(buffer);
    } else if (file.type === 'video/webm') {
      magicBytesValid = validateWebM(buffer);
    } else if (file.type === 'video/quicktime') {
      magicBytesValid = validateMOV(buffer);
    } else {
      magicBytesValid = validateMagicBytes(buffer, file.type);
    }

    // Also verify with file-type package as secondary check
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    const fileTypeMatches = fileTypeResult && (ALLOWED_IMAGE_TYPES.includes(fileTypeResult.mime) || ALLOWED_VIDEO_TYPES.includes(fileTypeResult.mime));

    if (!magicBytesValid || !fileTypeMatches) {
      return NextResponse.json(
        { error: 'Arquivo inválido ou corrompido. Verifique o formato do arquivo.' },
        { status: 400 }
      );
    }

    // Server-side video validation with ffprobe (if available)
    const postType = (formData.get('postType') as string) || 'FEED';
    if (isVideo) {
      try {
        const validation = await validateVideoFile(buffer, file.type, postType);

        if (!validation.valid) {
          return NextResponse.json(
            {
              error: 'Vídeo não atende aos requisitos da plataforma',
              details: validation.errors,
              warnings: validation.warnings,
              metadata: validation.metadata,
            },
            { status: 400 }
          );
        }

        // Include warnings in response if any
        if (validation.warnings.length > 0) {
          console.warn('Video validation warnings:', validation.warnings);
        }
      } catch (error) {
        // If ffprobe fails (not installed), log warning but continue
        // Client-side VideoValidator will handle validation
        console.warn('Server-side video validation skipped (ffprobe not available):', error);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Upload to Supabase Storage (using buffer already validated)
    const supabase = getSupabaseClient();
    const uploadResult = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      console.error('Supabase upload error:', uploadResult.error);
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
      type: isImage ? 'IMAGE' : 'VIDEO',
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Caminho do arquivo não fornecido' }, { status: 400 });
    }

    // Verify ownership
    if (!path.startsWith(`${session.user.id}/`)) {
      return NextResponse.json({ error: 'Não autorizado a excluir este arquivo' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from('media').remove([path]);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Erro ao excluir arquivo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}