import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ─── next-intl locale middleware (used for all normal traffic) ────────────────
const intlMiddleware = createMiddleware(routing);

// ─── Routes that must NEVER be blocked by maintenance mode ───────────────────
// Admin dashboard, specific admin-critical API routes, and static assets pass through.
// NOTE: /api/search is intentionally NOT exempted — it powers the public-facing search
// dock (SmartSearchDock.tsx) and has no function the admin dashboard depends on during
// maintenance. Only /api/leads (lead submission) and /api/properties (admin CRUD) are
// admin-critical and exempted.
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/maintenance')
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
    // Detect language using two signals, in priority order:
    // 1. URL path locale prefix (/ar/... → Arabic). This is the most reliable signal
    //    because it reflects the user's deliberate locale choice, and it works correctly
    //    for crawlers and tools that send no Accept-Language header.
    // 2. Accept-Language header as a secondary fallback for the root or ambiguous paths.
    const pathLocale = pathname.split('/')[1]; // e.g. 'ar' from '/ar/properties/...'
    const acceptLang = req.headers.get('accept-language') || '';
    const prefersArabic =
      pathLocale === 'ar' || // path prefix wins — explicit locale in URL
      (!pathLocale || pathLocale === 'en' ? acceptLang.toLowerCase().includes('ar') : false);
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
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
