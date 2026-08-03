import { Suspense } from 'react';
import { LoginPage } from '@/client/features/auth/pages/LoginPage';

export const dynamic = 'force-dynamic';

export default function ClientLogin() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <LoginPage />
    </Suspense>
  );
}
