import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { wrapMiddlewareWithSentry } from '@sentry/nextjs';

const publicRoutes = ['/login', '/register'];
const apiAuthPrefix = '/api/auth';

// Generate a cryptographically secure nonce for CSP
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

// Build CSP directives with nonce support
function buildCSPDirectives(nonce: string, reportOnly: boolean = true): string {
  const policy = [
    "default-src 'self'",
    // Removed 'unsafe-eval' - Next.js 14 App Router doesn't require it in production
    // Using nonce for inline scripts, 'unsafe-inline' kept as fallback during Report-Only phase
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://www.googletagmanager.com`,
    // 'unsafe-inline' required for Tailwind/Radix inline styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://via.placeholder.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Specific connect-src for allowed external services
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com wss://*.upstash.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Report violations to /api/csp-report (to be implemented)
    "report-uri /api/csp-report",
  ].join('; ');

  return policy;
}

// Security headers factory - creates headers with dynamic nonce
function createSecurityHeaders(nonce: string, reportOnly: boolean = true) {
  const cspHeader = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  return {
    'X-DNS-Prefetch-Control': 'on',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    [cspHeader]: buildCSPDirectives(nonce, reportOnly),
    // Pass nonce to client for inline scripts that need it
    'X-CSP-Nonce': nonce,
  };
}

function applySecurityHeaders(response: NextResponse, nonce: string, reportOnly: boolean = true) {
  const headers = createSecurityHeaders(nonce, reportOnly);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

async function sentryWrappedMiddleware(request: NextRequest) {
  const { nextUrl } = request;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // Generate nonce per request for CSP
  const nonce = generateNonce();
  // Start with Report-Only mode; switch to enforce after monitoring violations
  const reportOnly = process.env.NODE_ENV === 'production' ? false : true;

  if (isApiAuthRoute) return applySecurityHeaders(NextResponse.next(), nonce, reportOnly);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = !!token;

  if (!isLoggedIn && !isPublicRoute) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return applySecurityHeaders(
      NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl.origin)
      ),
      nonce,
      reportOnly
    );
  }

  if (isLoggedIn && isPublicRoute) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/calendar', nextUrl.origin)),
      nonce,
      reportOnly
    );
  }

  return applySecurityHeaders(NextResponse.next(), nonce, reportOnly);
}

// Wrap middleware with Sentry for error tracking
export const middleware = wrapMiddlewareWithSentry(sentryWrappedMiddleware);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)'],
};