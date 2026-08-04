import { Suspense } from 'react';
import { PayosReturnClient } from './PayosReturnClient';

export const dynamic = 'force-dynamic';

export default function PayosReturn() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <PayosReturnClient />
    </Suspense>
  );
}
