import { Suspense } from 'react';
import { ForgotPasswordPage } from '@/client/features/auth/pages/ForgotPasswordPage';

export const dynamic = 'force-dynamic';

export default function ClientForgotPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
