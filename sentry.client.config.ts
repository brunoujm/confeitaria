import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para o Client (Browser)
 * Este arquivo é carregado apenas no navegador
 */
Sentry.init({
  // DSN será lido da variável de ambiente NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ambiente (development, staging, production)
  environment: process.env.NODE_ENV || 'development',

  // Release version (opcional - pode ser configurado via CI/CD)
  release: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',

  // Sample rate para transações de performance (0.0 a 1.0)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Sample rate para profiling (0.0 a 1.0)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Habilita debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === 'development',

  // Não envia dados PII (informações pessoais) por padrão
  sendDefaultPii: false,

  // Antes de enviar evento, podemos filtrar/modificar
  beforeSend(event, hint) {
    // Não enviar erros de desenvolvimento para o Sentry
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Filtrar erros conhecidos que não são actionable
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignorar erros de rede comuns
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        return null;
      }
      // Ignorar erros de hidratação do Next.js em desenvolvimento
      if (error.message.includes('Hydration') && process.env.NODE_ENV !== 'production') {
        return null;
      }
    }

    return event;
  },

  // Configuração de breadcrumbs (rastro de ações do usuário)
  maxBreadcrumbs: 50,

  // Tags globais para todos os eventos
  initialScope: {
    tags: {
      component: 'client',
      project: 'confeitaria-content-manager',
    },
  },
});