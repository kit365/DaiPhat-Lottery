import { Suspense } from 'react';
import { FortuneCastPage } from '@/client/features/fortune';

export default function FortunePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <FortuneCastPage />
    </Suspense>
  );
}

