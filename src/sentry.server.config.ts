import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para o Server (Node.js)
 * Este arquivo é carregado via instrumentation.ts
 */
export function initSentryServer() {
  Sentry.init({
    // DSN será lido da variável de ambiente SENTRY_DSN
    dsn: process.env.SENTRY_DSN,

    // Ambiente (development, staging, production)
    environment: process.env.NODE_ENV || 'development',

    // Release version
    release: process.env.APP_VERSION || '0.1.0',

    // Sample rate para transações de performance
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Sample rate para profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Habilita debug apenas em desenvolvimento
    debug: process.env.NODE_ENV === 'development',

    // Não envia dados PII por padrão
    sendDefaultPii: false,

    // Antes de enviar evento, podemos filtrar/modificar
    beforeSend(event, hint) {
      // Não enviar erros de desenvolvimento para o Sentry
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignorar erros de conexão com banco de dados esperados
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          return event;
        }
        // Ignorar erros de validação conhecidos
        if (error.name === 'ZodError' || error.name === 'ValidationError') {
          return null;
        }
      }

      return event;
    },

    // Configuração de breadcrumbs
    maxBreadcrumbs: 50,

    // Tags globais
    initialScope: {
      tags: {
        component: 'server',
        project: 'confeitaria-content-manager',
      },
    },
  });
}

// Auto-inicializa quando importado
initSentryServer();