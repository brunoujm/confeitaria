import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // skipCSRFCheck handled by Credentials provider
  callbacks: {
    async authorized({ request, auth }: { request: { nextUrl: URL }; auth: any }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth;
      const isApiAuthRoute = pathname.startsWith('/api/auth');
      const isPublicRoute = ['/login', '/register'].includes(pathname);

      if (isApiAuthRoute) return true;

      if (!isLoggedIn && !isPublicRoute) {
        return false;
      }

      if (isLoggedIn && isPublicRoute) {
        return Response.redirect(new URL('/calendar', request.nextUrl.origin));
      }

      return true;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials) return null;

        const schema = z.object({
          email: z.string().email('Email inválido'),
          password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        });

        const parsed = schema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);