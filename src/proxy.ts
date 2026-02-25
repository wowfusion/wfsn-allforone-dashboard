/**
 * Next.js 16 Proxy (ehemals Middleware) – RBAC Guard für geschützte Routen.
 * Edge-kompatibel: nutzt next-auth/jwt direkt, kein Prisma-Import.
 */

import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';

/** Routen die mindestens MEMBER-Zugriff benötigen */
const PROTECTED_ROUTES = ['/dashboard', '/events', '/my-signups'];

/** Routen die mindestens OFFICER-Zugriff benötigen */
const OFFICER_ROUTES = ['/admin'];

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isOfficerRoute = OFFICER_ROUTES.some((r) => pathname.startsWith(r));

  if (!isProtected && !isOfficerRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const roles = (token.appRoles ?? []) as AppRole[];

  if (isOfficerRoute && !can.viewStats(roles)) {
    return NextResponse.redirect(new URL('/unauthorized?reason=no_role', req.url));
  }

  if (isProtected && !can.viewEvents(roles)) {
    return NextResponse.redirect(new URL('/unauthorized?reason=no_role', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/events/:path*', '/my-signups/:path*', '/admin/:path*'],
};
