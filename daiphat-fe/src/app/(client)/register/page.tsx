import { Suspense } from 'react';
import { RegisterPage } from '@/client/features/auth/pages/RegisterPage';

export const dynamic = 'force-dynamic';

export default function ClientRegister() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <RegisterPage />
    </Suspense>
  );
}
