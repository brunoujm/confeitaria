import createMiddleware from 'next-intl/middleware';
import { wrapMiddlewareWithSentry } from '@sentry/nextjs';

const locales = ['pt-BR', 'en'] as const;
const defaultLocale = 'pt-BR';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

async function sentryWrappedMiddleware(request: Request) {
  const response = intlMiddleware(request as any);

  // Apply security headers
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://via.placeholder.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };

  const responseWithHeaders = response instanceof Response ? response : new Response();

  Object.entries(securityHeaders).forEach(([key, value]) => {
    responseWithHeaders.headers.set(key, value);
  });

  return responseWithHeaders;
}

export default wrapMiddlewareWithSentry(sentryWrappedMiddleware);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$|api|_vercel|.*\\.txt$).*)',
  ],
};