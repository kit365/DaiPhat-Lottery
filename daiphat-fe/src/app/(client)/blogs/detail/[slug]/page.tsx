import { Suspense } from 'react';
import { BlogDetailPage } from '@/client/features/blog';

export const dynamic = 'force-dynamic';

export default function BlogDetail() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <BlogDetailPage />
    </Suspense>
  );
}
