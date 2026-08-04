import { Suspense } from 'react';
import { OAuthCallbackClient } from './OAuthCallbackClient';

export const dynamic = 'force-dynamic';

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang xử lý đăng nhập...</div>}>
      <OAuthCallbackClient />
    </Suspense>
  );
}
