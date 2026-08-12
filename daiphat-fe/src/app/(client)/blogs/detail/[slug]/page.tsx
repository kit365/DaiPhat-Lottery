import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlogDetailPage } from '@/client/features/blog';

const backendBase = process.env.BACKEND_UPSTREAM || 'http://localhost:8080';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const response = await fetch(`${backendBase.replace(/\/$/, '')}/api/blogs/public/${slug}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return { title: 'Bài viết | Đại Phát Lottery' };
    }

    const payload = await response.json();
    const post = payload?.data;

    if (!post?.title) {
      return { title: 'Bài viết | Đại Phát Lottery' };
    }

    return {
      title: `${post.title} | Đại Phát Lottery`,
      description: post.excerpt || post.summary || undefined,
      openGraph: post.thumbnail
        ? {
            images: [{ url: post.thumbnail }],
          }
        : undefined,
    };
  } catch {
    return { title: 'Bài viết | Đại Phát Lottery' };
  }
}

export default function BlogDetail() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <BlogDetailPage />
    </Suspense>
  );
}
