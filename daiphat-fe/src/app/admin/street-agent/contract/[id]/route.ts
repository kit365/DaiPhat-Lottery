import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const backendBase = () => {
  const raw =
    process.env.BACKEND_UPSTREAM ||
    process.env.VITE_DEV_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8080';
  return (raw.startsWith('http') ? raw : `http://${raw}`).replace(/\/$/, '');
};

/**
 * Streams the street-agent contract PDF so the browser shows its native PDF viewer
 * at a real URL (e.g. /admin/street-agent/contract/1) — no iframe / blob tab.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: 'ID hợp đồng không hợp lệ.' }, { status: 400 });
  }

  const token = request.cookies.get('token')?.value?.trim();
  if (!token) {
    return NextResponse.json(
      { message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }

  const upstream = `${backendBase()}/api/v1/street-agent-profiles/${id}/contract/pdf`;
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'Không kết nối được máy chủ để tạo PDF hợp đồng.' },
      { status: 502 }
    );
  }

  const contentType = upstreamResponse.headers.get('content-type') || '';
  if (!upstreamResponse.ok || !contentType.includes('pdf')) {
    let message = 'Không mở được hợp đồng PDF';
    try {
      const body = await upstreamResponse.json();
      if (body?.message) message = body.message;
    } catch {
      // keep default
    }
    return NextResponse.json({ message }, { status: upstreamResponse.status || 500 });
  }

  const fileName =
    upstreamResponse.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/i)?.[1] ||
    `hop-dong-dai-ly-${id}.pdf`;

  return new NextResponse(upstreamResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
