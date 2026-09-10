import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type AuthCtx = { params: Promise<{ auth: string[] }> };

const handle = async (req: NextRequest, ctx: AuthCtx) => {
    const { auth } = await ctx.params;
    const path = ["auth", ...(auth ?? []).filter(Boolean)].join("/");
    return proxyToBackend(req, path, { rewriteCookiePathToRoot: true });
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
