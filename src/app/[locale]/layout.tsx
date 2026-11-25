import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from '@/lib/i18n';
import { getValidatedEnv } from '@/lib/env';

export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en' }];
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Runtime environment validation - runs at request time, not build time
// This avoids build failures when Vercel build environment lacks some env vars
// The getValidatedEnv() function caches the result, so this only validates once
getValidatedEnv();

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages(locale as 'pt-BR' | 'en');

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}