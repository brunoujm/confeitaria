import { z } from 'zod';
import { validateFFprobeAvailable } from './video-metadata';

/**
 * Schema de validação das variáveis de ambiente
 * Separa variáveis obrigatórias, opcionais e específicas de ambiente
 */
const envSchema = z.object({
  // ==========================================
  // DATABASE (Turso/libSQL)
  // ==========================================
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória').url('DATABASE_URL deve ser uma URL válida'),
  DATABASE_AUTH_TOKEN: z.string().optional(), // Opcional para SQLite local

  // ==========================================
  // NEXTAUTH
  // ==========================================
  NEXTAUTH_URL: z.string().min(1, 'NEXTAUTH_URL é obrigatória').url('NEXTAUTH_URL deve ser uma URL válida'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET deve ter no mínimo 32 caracteres'),

  // ==========================================
  // SUPABASE STORAGE
  // ==========================================
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL é obrigatória').url('Deve ser URL válida do Supabase'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, 'SUPABASE_STORAGE_BUCKET é obrigatória').default('media'),

  // ==========================================
  // AI PROVIDERS (pelo menos um é obrigatório em produção)
  // ==========================================
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ==========================================
  // UPSTASH REDIS (Rate Limiting) - Opcional em desenvolvimento
  // ==========================================
  UPSTASH_REDIS_REST_URL: z.string().url('Deve ser URL válida do Upstash').optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal('')),

  // ==========================================
  // SOCKET.IO
  // ==========================================
  NEXT_PUBLIC_SOCKET_URL: z.string().min(1, 'NEXT_PUBLIC_SOCKET_URL é obrigatória').url('Deve ser URL válida'),
  SOCKET_SECRET: z.string().min(1, 'SOCKET_SECRET é obrigatória'),

  // ==========================================
  // CRON JOBS
  // ==========================================
  CRON_SECRET: z.string().min(32, 'CRON_SECRET deve ter no mínimo 32 caracteres').optional(),

  // ==========================================
  // NODE ENV
  // ==========================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Valida as variáveis de ambiente no startup da aplicação
 * Lança erro descritivo se variáveis obrigatórias estiverem ausentes ou inválidas
 * NUNCA expõe segredos nos logs de erro
 */
export function validateEnv(): z.infer<typeof envSchema> {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    SOCKET_SECRET: process.env.SOCKET_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      // Não loga o valor real da variável, apenas o nome
      return `  - ${path}: ${issue.message}`;
    });

    const errorMessage = [
      '❌ Falha na validação das variáveis de ambiente:',
      '',
      ...errors,
      '',
      '📋 Verifique o arquivo .env e compare com .env.example',
      '🔒 Valores sensíveis NÃO são exibidos por segurança',
    ].join('\n');

    // Em desenvolvimento, mostra erro detalhado no console
    // Em produção, lança erro genérico para não vazar informações
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMessage);
    } else {
      console.error('❌ Configuração de ambiente inválida. Verifique as variáveis obrigatórias.');
    }

    throw new Error('Invalid environment configuration');
  }

  // Log de sucesso (apenas nomes das variáveis, sem valores)
  if (process.env.NODE_ENV === 'development') {
    const validatedKeys = Object.keys(result.data).filter(key => result.data[key as keyof typeof result.data] !== undefined);
    console.log(`✅ Variáveis de ambiente validadas (${validatedKeys.length}):`, validatedKeys.join(', '));
  }

  return result.data;
}

/**
 * Validação específica para variáveis de IA
 * Em produção, pelo menos um provider deve estar configurado
 */
export function validateAIProviders(env: z.infer<typeof envSchema>): void {
  const hasOpenAI = !!env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'placeholder-openai-key';
  const hasAnthropic = !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY !== 'placeholder-anthropic-key';

  if (env.NODE_ENV === 'production' && !hasOpenAI && !hasAnthropic) {
    const msg = '⚠️ AVISO: Nenhum provider de IA configurado para produção (OPENAI_API_KEY ou ANTHROPIC_API_KEY)';
    console.warn(msg);
  }
}

/**
 * Validação específica para Redis (Rate Limiting)
 * Em produção, Redis deve estar configurado para fail-closed
 */
export function validateRedis(env: z.infer<typeof envSchema>): void {
  const hasRedis = !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;

  if (env.NODE_ENV === 'production' && !hasRedis) {
    const msg = '⚠️ AVISO: Upstash Redis não configurado. Rate limiting será fail-closed (bloqueia requisições) em produção.';
    console.warn(msg);
  }
}

/**
 * Validação de ffprobe no startup
 * Em produção, falha o build/inicialização se ffprobe não estiver disponível
 */
export async function validateFFprobe(): Promise<void> {
  try {
    await validateFFprobeAvailable();
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ ffprobe disponível - validação server-side de vídeos ativa');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      // Em produção, o erro já foi lançado com mensagem descritiva
      throw error;
    }
    // Em desenvolvimento, apenas loga warning
    console.warn('⚠️ ffprobe não disponível:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Instância validada das variáveis de ambiente (singleton)
 * Deve ser chamada uma única vez no startup da aplicação
 */
let validatedEnv: z.infer<typeof envSchema> | null = null;

export async function getValidatedEnv(): Promise<z.infer<typeof envSchema>> {
  if (!validatedEnv) {
    validatedEnv = validateEnv();
    validateAIProviders(validatedEnv);
    validateRedis(validatedEnv);
    // Validar ffprobe no startup (async)
    await validateFFprobe();
  }
  return validatedEnv;
}

/**
 * Versão síncrona para compatibilidade (usa validação já feita)
 * ATENÇÃO: Deve ser chamada apenas após getValidatedEnv() ter sido executado
 */
export function getValidatedEnvSync(): z.infer<typeof envSchema> {
  if (!validatedEnv) {
    throw new Error('getValidatedEnv() deve ser chamado antes de getValidatedEnvSync()');
  }
  return validatedEnv;
}

/**
 * Helper para verificar se está em desenvolvimento
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Helper para verificar se está em produção
 */
export const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Helper para verificar se está em teste
 */
export const isTest = () => process.env.NODE_ENV === 'test';