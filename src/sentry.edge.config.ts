import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para Edge Runtime (Middleware)
 * Este arquivo é carregado via instrumentation.ts
 */
export function initSentryEdge() {
  Sentry.init({
    // DSN será lido da variável de ambiente SENTRY_DSN
    dsn: process.env.SENTRY_DSN,

    // Ambiente
    environment: process.env.NODE_ENV || 'development',

    // Release version
    release: process.env.APP_VERSION || '0.1.0',

    // Sample rate para transações (menor no edge por limitações)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Habilita debug apenas em desenvolvimento
    debug: process.env.NODE_ENV === 'development',

    // Não envia dados PII
    sendDefaultPii: false,

    // Antes de enviar evento
    beforeSend(event, hint) {
      // Não enviar em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

      return event;
    },

    // Tags globais
    initialScope: {
      tags: {
        component: 'edge',
        project: 'confeitaria-content-manager',
      },
    },
  });
}

// Auto-inicializa quando importado
initSentryEdge();