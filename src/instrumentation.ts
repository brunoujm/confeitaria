/**
 * Instrumentação do Sentry para Server e Edge Runtime
 * Este arquivo é carregado automaticamente pelo Next.js no startup do servidor
 * Referência: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Só inicializa no servidor (não no edge durante build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}