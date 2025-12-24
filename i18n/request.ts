import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  // Пытаемся получить локаль из requestLocale (для /en путей)
  let locale = await requestLocale;

  // Если нет локали в URL, проверяем cookie
  if (!locale || !routing.locales.includes(locale as any)) {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    
    if (localeCookie && routing.locales.includes(localeCookie as any)) {
      locale = localeCookie as any;
    } else {
      // Проверяем заголовок
      const headersList = await headers();
      const localeHeader = headersList.get('x-next-intl-locale');
      
      if (localeHeader && routing.locales.includes(localeHeader as any)) {
        locale = localeHeader as any;
      } else {
        // Используем дефолтную локаль
        locale = routing.defaultLocale;
      }
    }
  }

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

