import { Suspense } from 'react';
import { BlogListPage } from '@/client/features/blog';

export const dynamic = 'force-dynamic';

export default function BlogsList() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <BlogListPage />
    </Suspense>
  );
}
