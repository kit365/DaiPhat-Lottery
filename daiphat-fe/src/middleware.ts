// Middleware để bảo vệ route admin và auth trước khi vô mount UI rồi mới check trong Zustand có token không
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'token';
const ADMIN_PREFIX = '/admin';
const AUTH_PREFIX = '/admin/auth';
const LOGIN_PATH = '/admin/auth/login';
const DASHBOARD_PATH = '/admin/dashboard';

const STAFF_ROLES = new Set([
    'ROLE_ADMIN',
    'ROLE_SUPER_ADMIN',
    'ROLE_STAFF_OPERATOR',
    'ADMIN',
    'SUPER_ADMIN',
    'STAFF_OPERATOR',
]);

function parseJwtRole(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
        const json = atob(paddedBase64);
        const payload = JSON.parse(json);
        return payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : null) || null;
    } catch {
        return null;
    }
}

function getStaffAuthenticationState(request: NextRequest): { hasToken: boolean; isStaff: boolean } {
    const token = request.cookies.get(TOKEN_COOKIE)?.value?.trim();
    if (!token || token === 'undefined' || token === 'null') {
        return { hasToken: false, isStaff: false };
    }
    const role = parseJwtRole(token);
    const isStaff = !!role && STAFF_ROLES.has(role);
    return { hasToken: true, isStaff };
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith(ADMIN_PREFIX)) {
        return NextResponse.next();
    }

    const isAuthRoute = pathname.startsWith(AUTH_PREFIX);
    const { hasToken, isStaff } = getStaffAuthenticationState(request);

    if (isAuthRoute) {
        if (isStaff && pathname === LOGIN_PATH) {
            return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
        }
        return NextResponse.next();
    }

    // Không có quyền staff: nếu có token member thì về trang chủ, chưa login thì về trang login admin
    if (!isStaff) {
        if (hasToken) {
            return NextResponse.redirect(new URL('/', request.url));
        }
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

