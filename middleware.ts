import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Пропускаем API routes и статические файлы
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Если путь уже начинается с /ru или /en, используем стандартный middleware
  if (pathname.startsWith('/ru') || pathname.startsWith('/en')) {
    return intlMiddleware(request);
  }
  
  // Для дефолтной локали (ru) не переписываем URL, просто устанавливаем локаль
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', routing.defaultLocale);
  response.headers.set('x-next-intl-locale', routing.defaultLocale);
  return response;
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - Files with an extension (e.g., .ico, .png, .jpg)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

