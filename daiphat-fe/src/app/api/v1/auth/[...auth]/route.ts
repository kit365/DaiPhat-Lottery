import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backendOrigin = () => {
    const raw = process.env.BACKEND_UPSTREAM || "http://localhost:8080";
    return `${raw.startsWith("http") ? raw : `http://${raw}`}`.replace(/\/$/, "");
};

/** Local BE sets Path=/api/v1/auth — Next rewrite often drops that cookie. Path=/ always reaches refresh. */
const rewriteSetCookiePath = (cookie: string) => {
    if (/;\s*Path=/i.test(cookie)) {
        return cookie.replace(/;\s*Path=[^;]*/i, "; Path=/");
    }
    return `${cookie}; Path=/`;
};

const hopByHop = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length"]);

async function proxy(req: NextRequest, auth: string[]) {
    const path = auth.filter(Boolean).join("/");
    const target = `${backendOrigin()}/api/v1/auth/${path}${req.nextUrl.search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
        if (hopByHop.has(key.toLowerCase())) return;
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

    const upstream = await fetch(target, init);
    const out = new NextResponse(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
    });

    upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        out.headers.append(key, value);
    });

    const setCookies =
        typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
    for (const cookie of setCookies) {
        out.headers.append("Set-Cookie", rewriteSetCookiePath(cookie));
    }

    return out;
}

type AuthCtx = { params: Promise<{ auth: string[] }> };

const handle = async (req: NextRequest, ctx: AuthCtx) => {
    const { auth } = await ctx.params;
    return proxy(req, auth ?? []);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
