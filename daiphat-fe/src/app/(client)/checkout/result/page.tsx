import { Suspense } from 'react';
import { CheckoutResultClient } from './CheckoutResultClient';

export const dynamic = 'force-dynamic';

export default function CheckoutResult() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <CheckoutResultClient />
    </Suspense>
  );
}
