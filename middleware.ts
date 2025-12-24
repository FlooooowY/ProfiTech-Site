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
  
  // Всегда используем стандартный middleware next-intl для правильной обработки локалей
  // Он сам обработает localePrefix: 'as-needed'
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - Files with an extension (e.g., .ico, .png, .jpg)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

