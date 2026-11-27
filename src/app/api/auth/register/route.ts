import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authRateLimiter, checkRateLimit, getClientIp } from '@/lib/ratelimit';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

// Generic error message to prevent account enumeration
const REGISTRATION_ERROR_MESSAGE = 'Se este email não estiver cadastrado, você receberá instruções';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP: 5 requests per minute per IP
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(authRateLimiter, `register:${clientIp}`);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Muitas tentativas de registro. Tente novamente em um minuto.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user exists (but don't reveal this to prevent enumeration)
    const existingUser = await prisma.user.findUnique({ where: { email } });

    // Always return the same generic message to prevent account enumeration
    // Only actually create the user if email doesn't exist
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'OWNER',
          emailNotifications: true,
        },
      });
    }

    // Return generic success message regardless of whether user was created or already existed
    const response = NextResponse.json(
      { message: REGISTRATION_ERROR_MESSAGE },
      { status: 200 }
    );
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}