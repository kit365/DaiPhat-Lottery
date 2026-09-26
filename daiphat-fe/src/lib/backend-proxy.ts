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

/** Default for normal API / uploads. */
const DEFAULT_PROXY_TIMEOUT_MS = 120_000;
/**
 * OCR scan: BE → ticket-vision can take up to ~180s (and occasionally a
 * station-template re-scan). Must stay above FE axios (190s) so the proxy
 * does not abort first and surface a fake "cannot connect" error.
 */
const OCR_SCAN_PROXY_TIMEOUT_MS = 210_000;

const isOcrScanPath = (normalized: string): boolean =>
    normalized === "lottery-tickets/scan" || normalized.endsWith("/lottery-tickets/scan");

const isEvidenceUploadPath = (normalized: string): boolean =>
    normalized.includes("invoice-evidence/upload") ||
    normalized.includes("ticket-list-images/upload") ||
    normalized.endsWith("/upload");

const resolveProxyTimeoutMs = (apiPath: string): number => {
    const normalized = apiPath.replace(/^\/+|\/+$/g, "").toLowerCase();
    if (isOcrScanPath(normalized)) {
        return OCR_SCAN_PROXY_TIMEOUT_MS;
    }
    return DEFAULT_PROXY_TIMEOUT_MS;
};

const proxyTimeoutMessage = (apiPath: string): string => {
    const normalized = apiPath.replace(/^\/+|\/+$/g, "").toLowerCase();
    if (isOcrScanPath(normalized)) {
        return (
            "Quét OCR mất quá nhiều thời gian (ảnh nhiều vé hoặc xử lý AI chậm). " +
            "Vui lòng đợi 10–20 giây rồi quét lại từng ảnh, hoặc tách ảnh nhiều vé thành ảnh riêng."
        );
    }
    if (isEvidenceUploadPath(normalized)) {
        return (
            "Tải tệp lên máy chủ mất quá nhiều thời gian. " +
            "Vui lòng thử lại với ảnh/tệp nhỏ hơn (dưới 5–10MB) hoặc kiểm tra kết nối mạng / Cloudinary."
        );
    }
    return "Yêu cầu tới máy chủ API mất quá nhiều thời gian. Vui lòng thử lại.";
};

const isAbortError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const err = error as { name?: string; code?: string; cause?: { name?: string; code?: string } };
    return (
        err.name === "AbortError" ||
        err.name === "TimeoutError" ||
        err.code === "ABORT_ERR" ||
        err.cause?.name === "AbortError" ||
        err.cause?.code === "ABORT_ERR"
    );
};

const isConnectionRefused = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const err = error as { code?: string; cause?: { code?: string }; message?: string };
    const code = err.code || err.cause?.code || "";
    const message = `${err.message ?? ""} ${err.cause ? String(err.cause) : ""}`.toLowerCase();
    return (
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "ECONNRESET" ||
        message.includes("econnrefused") ||
        message.includes("fetch failed")
    );
};

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
    const timeoutMs = resolveProxyTimeoutMs(apiPath);

    const headers = new Headers();
    req.headers.forEach((value, key) => {
        if (HOP_BY_HOP.has(key.toLowerCase())) return;
        headers.set(key, value);
    });

    const init: RequestInit & { duplex?: "half" } = {
        method: req.method,
        headers,
        redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
        const contentType = (req.headers.get("content-type") || "").toLowerCase();
        // Multipart evidence uploads: stream the body so Next does not buffer the
        // entire file before Spring/Cloudinary starts receiving bytes (cuts latency).
        if (contentType.includes("multipart/form-data") && req.body) {
            init.body = req.body;
            init.duplex = "half";
        } else {
            init.body = await req.arrayBuffer();
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let upstream: Response;
    try {
        upstream = await fetch(target, { ...init, signal: controller.signal });
    } catch (error) {
        console.error(`[api-proxy] ${req.method} ${target} failed`, error);
        if (isAbortError(error)) {
            return NextResponse.json(
                {
                    success: false,
                    message: proxyTimeoutMessage(apiPath),
                },
                { status: 504 }
            );
        }
        if (isConnectionRefused(error)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Không kết nối được máy chủ API. Kiểm tra backend đang chạy.",
                },
                { status: 502 }
            );
        }
        return NextResponse.json(
            {
                success: false,
                message:
                    "Không gửi được yêu cầu tới máy chủ API. Vui lòng thử lại; nếu lỗi kéo dài hãy kiểm tra backend.",
            },
            { status: 502 }
        );
    } finally {
        clearTimeout(timeout);
    }

    // Buffer body instead of streaming pipe: SockJS/xhr long-polls and flaky
    // upstream closes otherwise surface as uncaught "failed to pipe response".
    let body: ArrayBuffer | null = null;
    try {
        body = await upstream.arrayBuffer();
    } catch (error) {
        console.error(`[api-proxy] ${req.method} ${target} upstream body closed`, error);
        return NextResponse.json(
            { success: false, message: "Máy chủ API đóng kết nối sớm." },
            { status: 502 }
        );
    }

    const out = new NextResponse(body, {
        status: upstream.status,
        statusText: upstream.statusText,
    });

    upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "set-cookie" || lower === "content-encoding" || lower === "content-length") {
            return;
        }
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
