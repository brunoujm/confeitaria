import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as tmp from 'tmp';
import { validateVideoServerSide, type VideoMetadata as ValidationVideoMetadata } from './video-validation';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  codec?: string;
  bitrate?: number;
  frameRate?: number;
}

// Verificar se ffprobe está disponível no sistema
async function checkFfprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

// Extrair metadados usando ffprobe do sistema
async function extractVideoMetadataWithFfprobe(buffer: Buffer): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const tmpFile = tmp.fileSync({ postfix: '.mp4' });
    fs.writeFile(tmpFile.name, buffer).then(() => {
      const proc = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        tmpFile.name
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', async (code) => {
        // Limpar arquivo temporário
        try {
          await fs.unlink(tmpFile.name);
        } catch {
          // Ignore cleanup errors
        }

        if (code !== 0) {
          reject(new Error(`ffprobe falhou: ${stderr}`));
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          const videoStream = metadata.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
          const format = metadata.format;

          if (!videoStream) {
            reject(new Error('Nenhum stream de vídeo encontrado'));
            return;
          }

          // Safely parse frame rate (avoid eval)
          let frameRate: number | undefined;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (den > 0) frameRate = num / den;
          }

          resolve({
            duration: format.duration ? parseFloat(format.duration) : 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fileSize: format.size ? parseInt(format.size) : buffer.length,
            format: format.format_name || 'unknown',
            codec: videoStream.codec_name,
            bitrate: format.bit_rate ? parseInt(format.bit_rate) : undefined,
            frameRate,
          });
        } catch (e) {
          reject(new Error(`Erro ao parsear saída do ffprobe: ${e instanceof Error ? e.message : String(e)}`));
        }
      });
    }).catch(reject);
  });
}

// Função principal de validação com fallback gracioso
export async function validateVideoFile(
  buffer: Buffer,
  mimeType: string,
  postType: string
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: VideoMetadata;
  serverValidated: boolean;
}> {
  // Verificar se ffprobe está disponível
  const ffprobeAvailable = await checkFfprobeAvailable();

  if (!ffprobeAvailable) {
    // Fallback: validação básica apenas (tamanho, tipo)
    // A validação completa acontece no client-side com VideoValidator
    return {
      valid: true,
      errors: [],
      warnings: ['Validação server-side completa não disponível (ffprobe não instalado). Validação feita no client-side.'],
      serverValidated: false,
    };
  }

  try {
    const metadata = await extractVideoMetadataWithFfprobe(buffer);

    // Adicionar formato MIME aos metadados
    const metadataWithMime: ValidationVideoMetadata = {
      ...metadata,
      format: mimeType,
    };

    const validation = validateVideoServerSide(metadataWithMime, postType);

    return {
      ...validation,
      metadata,
      serverValidated: true,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Erro ao validar vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
      warnings: [],
      serverValidated: true,
    };
  }
}