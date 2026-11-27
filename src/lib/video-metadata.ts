import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as tmp from 'tmp';
import { validateVideoServerSide, type VideoMetadata as ValidationVideoMetadata } from './video-validation';
import { isProduction } from './env';

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

/**
 * Verifica se ffprobe está disponível no sistema
 * Em produção, lança erro se não estiver disponível
 * Em desenvolvimento, retorna false com warning
 */
export async function validateFFprobeAvailable(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', ['-version']);
    proc.on('error', () => {
      if (isProduction()) {
        reject(new Error(
          '❌ ffprobe não está instalado. Em produção, ffprobe é obrigatório para validação server-side de vídeos.\n' +
          '📦 Instale ffprobe no ambiente de produção (Vercel: use buildpack https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest)'
        ));
      } else {
        console.warn('⚠️ ffprobe não encontrado. Validação server-side de vídeos desabilitada (fallback para client-side).');
        resolve();
      }
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        if (isProduction()) {
          reject(new Error(
            '❌ ffprobe falhou ao executar. Verifique a instalação no ambiente de produção.'
          ));
        } else {
          console.warn('⚠️ ffprobe retornou código de saída não-zero. Validação server-side desabilitada.');
          resolve();
        }
      }
    });
  });
}

// Verificar se ffprobe está disponível no sistema (legacy - mantido para compatibilidade)
async function _checkFfprobeAvailable(): Promise<boolean> {
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
  // Verificar se ffprobe está disponível - em produção lança erro se ausente
  try {
    await validateFFprobeAvailable();
  } catch (error) {
    // Em produção, o erro já foi lançado acima
    // Em desenvolvimento, continuamos com fallback
    if (isProduction()) {
      throw error;
    }
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