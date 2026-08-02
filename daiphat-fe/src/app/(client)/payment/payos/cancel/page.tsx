import { Suspense } from 'react';
import { PayosCancelClient } from './PayosCancelClient';

export const dynamic = 'force-dynamic';

export default function PayosCancel() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <PayosCancelClient />
    </Suspense>
  );
}
