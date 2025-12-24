import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Пропускаем API routes и статические файлы
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Если путь начинается с /en, используем стандартный middleware
  if (pathname.startsWith('/en')) {
    return createMiddleware(routing)(request);
  }
  
  // Для дефолтной локали (ru) не переписываем URL
  // Просто устанавливаем локаль через заголовок и cookie
  const response = NextResponse.next();
  response.headers.set('x-next-intl-locale', routing.defaultLocale);
  response.cookies.set('NEXT_LOCALE', routing.defaultLocale);
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

