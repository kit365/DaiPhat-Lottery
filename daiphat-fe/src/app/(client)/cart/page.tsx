import { Suspense } from 'react';
import { CartPage } from '@/client/features/cart';

export default function Cart() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <CartPage />
    </Suspense>
  );
}
