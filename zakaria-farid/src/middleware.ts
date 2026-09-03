import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

import { updateSession } from './lib/supabase/middleware';

// ─── next-intl locale middleware (used for all normal traffic) ────────────────
const intlMiddleware = createMiddleware(routing);

// ─── Routes that must NEVER be blocked by maintenance mode ───────────────────
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/fin-os') ||
    pathname.startsWith('/maintenance')
  );
}

// ─── Main middleware ──────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle any mistargeted /ar/fin-os or /en/fin-os paths by redirecting to clean /fin-os
  if (pathname.startsWith('/ar/fin-os') || pathname.startsWith('/en/fin-os')) {
    const cleanPath = pathname.replace(/^\/(ar|en)/, '');
    return NextResponse.redirect(new URL(cleanPath, req.url));
  }

  // ── Enforce Authentication on Admin & FIN-OS Engine ────────────────────────
  const isEngineRoute = pathname.startsWith('/fin-os');
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';

  if (isEngineRoute || isAdminRoute) {
    const { res, user } = await updateSession(req);

    if (isLoginPage) {
      // If user is already authenticated and visits login page, redirect them to dashboard
      if (user) {
        const nextUrl = req.nextUrl.searchParams.get('next') || '/admin';
        return NextResponse.redirect(new URL(nextUrl, req.url));
      }
      return res;
    }

    // Protected admin & engine routes: require active user session
    if (!user) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return res;
  }

  // Always pass exempt routes through without any maintenance check.
  if (isExempt(pathname)) {
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
