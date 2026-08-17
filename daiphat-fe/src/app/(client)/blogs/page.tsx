import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlogListPage } from '@/client/features/blog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bài viết | Đại Phát Lottery',
  description: 'Tin tức, mẹo chơi xổ số và cập nhật mới nhất từ Đại Phát Lottery.',
};

export default function BlogsList() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <BlogListPage />
    </Suspense>
  );
}
