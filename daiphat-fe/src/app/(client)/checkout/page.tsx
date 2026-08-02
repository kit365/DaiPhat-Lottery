import { Suspense } from 'react';
import { CheckoutPage } from '@/client/features/cart';

export const dynamic = 'force-dynamic';

export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <CheckoutPage />
    </Suspense>
  );
}
