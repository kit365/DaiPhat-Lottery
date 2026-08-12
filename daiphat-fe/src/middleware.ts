import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'token';
const ADMIN_PREFIX = '/admin';
const AUTH_PREFIX = '/admin/auth';
const LOGIN_PATH = '/admin/auth/login';
const DASHBOARD_PATH = '/admin/dashboard';

function hasAccessToken(request: NextRequest): boolean {
    const token = request.cookies.get(TOKEN_COOKIE)?.value?.trim();
    return !!token && token !== 'undefined' && token !== 'null';
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith(ADMIN_PREFIX)) {
        return NextResponse.next();
    }

    const isAuthRoute = pathname.startsWith(AUTH_PREFIX);
    const authenticated = hasAccessToken(request);

    if (isAuthRoute) {
        if (authenticated && pathname === LOGIN_PATH) {
            return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
        }
        return NextResponse.next();
    }

    if (!authenticated) {
        const loginUrl = new URL(LOGIN_PATH, request.url);
        if (pathname !== LOGIN_PATH) {
            loginUrl.searchParams.set('from', pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin', '/admin/:path*'],
};
