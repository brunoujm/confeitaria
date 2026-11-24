import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['pt-BR', 'en'] as const;
export const defaultLocale = 'pt-BR';

export type Locale = (typeof locales)[number];

export async function getMessages(locale: Locale) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }
}

export default getRequestConfig(async ({ locale }) => {
  const messages = await getMessages(locale as Locale);
  return {
    messages,
    locale,
    onError: (error) => {
      console.error('[next-intl]', error);
    }
  };
});