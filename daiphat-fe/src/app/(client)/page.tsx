import { Suspense } from 'react';
import { HomePage } from '@/client/features/home/HomePage';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <HomePage />
    </Suspense>
  );
}
