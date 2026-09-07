import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
    // Node undici rejects forwarding Expect: 100-continue (UND_ERR_NOT_SUPPORTED).
    "expect",
]);

/** Spring Boot upstream for App Router API proxies (multipart-safe; rewrites are not). */
export const backendOrigin = () => {
    const raw = process.env.BACKEND_UPSTREAM || "http://localhost:8080";
    return `${raw.startsWith("http") ? raw : `http://${raw}`}`.replace(/\/$/, "");
};

const UPLOAD_PROXY_TIMEOUT_MS = 120_000;

export type ProxyToBackendOptions = {
    /** Rewrite Set-Cookie Path (auth refresh cookies need Path=/ for the browser). */
    rewriteCookiePathToRoot?: boolean;
};

/** Prefer Path=/ for live refresh cookies; keep intentional legacy-path expiries intact. */
const rewriteSetCookiePath = (cookie: string) => {
    if (/;\s*Max-Age=0\b/i.test(cookie) && /;\s*Path=\/api\/v1\/auth\b/i.test(cookie)) {
        return cookie;
    }
    if (/;\s*Path=/i.test(cookie)) {
        return cookie.replace(/;\s*Path=[^;]*/i, "; Path=/");
    }
    return `${cookie}; Path=/`;
};

/** Expire the same cookie on Path=/api/v1/auth so browsers drop stale duplicates. */
const expireRefreshCookieOnLegacyAuthPath = (cookie: string): string | null => {
    if (/;\s*Max-Age=0\b/i.test(cookie)) return null;
    const nameMatch = cookie.match(/^([^=]+)=/);
    if (!nameMatch) return null;
    const name = nameMatch[1];
    if (!/refresh/i.test(name)) return null;
    const secure = /;\s*Secure/i.test(cookie) ? "; Secure" : "";
    const httpOnly = /;\s*HttpOnly/i.test(cookie) ? "; HttpOnly" : "";
    const sameSiteMatch = cookie.match(/;\s*SameSite=([^;]*)/i);
    const sameSite = sameSiteMatch ? `; SameSite=${sameSiteMatch[1]}` : "";
    return `${name}=; Path=/api/v1/auth; Max-Age=0${httpOnly}${secure}${sameSite}`;
};

/**
 * Stream /api/v1/* to Spring. Used instead of next.config rewrites for large multipart
 * uploads: standalone `next start` can truncate bodies (~1MB) on rewrite proxy.
 */
export async function proxyToBackend(
    req: NextRequest,
    apiPath: string,
    options: ProxyToBackendOptions = {}
) {
    const target = `${backendOrigin()}/api/v1/${apiPath}${req.nextUrl.search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
        if (HOP_BY_HOP.has(key.toLowerCase())) return;
        headers.set(key, value);
    });

    const init: RequestInit = {
        method: req.method,
        headers,
        redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = await req.arrayBuffer();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_PROXY_TIMEOUT_MS);
    let upstream: Response;
    try {
        upstream = await fetch(target, { ...init, signal: controller.signal });
    } catch (error) {
        console.error(`[api-proxy] ${req.method} ${target} failed`, error);
        return NextResponse.json(
            { success: false, message: "Không kết nối được máy chủ API. Kiểm tra backend đang chạy." },
            { status: 502 }
        );
    } finally {
        clearTimeout(timeout);
    }

    const out = new NextResponse(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
    });

    upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        out.headers.append(key, value);
    });

    if (options.rewriteCookiePathToRoot) {
        const setCookies =
            typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
        for (const cookie of setCookies) {
            out.headers.append("Set-Cookie", rewriteSetCookiePath(cookie));
            const legacyClear = expireRefreshCookieOnLegacyAuthPath(cookie);
            if (legacyClear) {
                out.headers.append("Set-Cookie", legacyClear);
            }
        }
    }

    return out;
}
