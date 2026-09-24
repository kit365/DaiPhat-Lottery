import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// OCR scan can run YOLO + multi-ticket Groq (~180s BE read timeout).
// Keep above backend-proxy OCR timeout (210s) so Next does not abort first.
export const maxDuration = 300;

type ApiCtx = { params: Promise<{ path: string[] }> };

const handle = async (req: NextRequest, ctx: ApiCtx) => {
    const { path } = await ctx.params;
    return proxyToBackend(req, (path ?? []).join("/"));
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
