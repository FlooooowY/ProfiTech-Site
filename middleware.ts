import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - Files with an extension (e.g., .ico, .png, .jpg)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

