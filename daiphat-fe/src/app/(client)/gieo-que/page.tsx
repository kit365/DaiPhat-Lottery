import { Suspense } from 'react';
import { FortuneCastPage } from '@/client/features/fortune';

export const dynamic = 'force-dynamic';

export default function GieoQuePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <FortuneCastPage />
    </Suspense>
  );
}
