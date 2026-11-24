import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { wrapMiddlewareWithSentry } from '@sentry/nextjs';

const publicRoutes = ['/login', '/register'];
const apiAuthPrefix = '/api/auth';

// Security headers
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

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

async function sentryWrappedMiddleware(request: NextRequest) {
  const { nextUrl } = request;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) return applySecurityHeaders(NextResponse.next());

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
      )
    );
  }

  if (isLoggedIn && isPublicRoute) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/calendar', nextUrl.origin))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

// Wrap middleware with Sentry for error tracking
export const middleware = wrapMiddlewareWithSentry(sentryWrappedMiddleware);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)'],
};