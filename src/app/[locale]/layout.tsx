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

// Runtime environment validation component
// Runs at request time, not build time - avoids build failures when Vercel build env vars are incomplete
async function EnvValidationWrapper({ children }: { children: React.ReactNode }) {
  await getValidatedEnv();
  return <>{children}</>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages(locale as 'pt-BR' | 'en');

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <EnvValidationWrapper>{children}</EnvValidationWrapper>
    </NextIntlClientProvider>
  );
}