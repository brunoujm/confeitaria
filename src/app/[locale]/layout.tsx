import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from '@/lib/i18n';

export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en' }];
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

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