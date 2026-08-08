import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ─── next-intl locale middleware (used for all normal traffic) ────────────────
const intlMiddleware = createMiddleware(routing);

// ─── Routes that must NEVER be blocked by maintenance mode ───────────────────
// Admin dashboard, API routes, and static assets all pass straight through.
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/maintenance') || // the page itself must load its own assets
    /\.[a-z0-9]+$/i.test(pathname)         // any file with an extension (css, js, png…)
  );
}

// ─── Main middleware ──────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass exempt routes through without any maintenance check.
  if (isExempt(pathname)) {
    // Still run intl middleware for non-static exempt routes that need locale.
    // Admin and API routes handle their own routing, so just return next().
    return NextResponse.next();
  }

  // ── Maintenance mode check ─────────────────────────────────────────────────
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (maintenanceMode) {
    // Detect preferred language from Accept-Language header to show correct copy.
    const acceptLang = req.headers.get('accept-language') || '';
    const prefersArabic = acceptLang.toLowerCase().includes('ar');
    const lang = prefersArabic ? 'ar' : 'en';

    // Rewrite the request IN-PLACE to the maintenance page (no URL change in
    // the visitor's address bar). Status 503 is passed directly so browsers
    // and search engines receive the correct "temporarily unavailable" signal.
    const url = req.nextUrl.clone();
    url.pathname = '/maintenance';
    url.searchParams.set('lang', lang);

    const response = NextResponse.rewrite(url, { status: 503 });

    // Retry-After: tell crawlers/CDNs to retry in 1 hour.
    response.headers.set('Retry-After', '3600');
    response.headers.set('X-Robots-Tag', 'noindex');

    return response;
  }

  // ── Normal traffic: delegate to next-intl locale middleware ───────────────
  return intlMiddleware(req);
}

export const config = {
  // Match all paths except Next.js internals and static files handled above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
