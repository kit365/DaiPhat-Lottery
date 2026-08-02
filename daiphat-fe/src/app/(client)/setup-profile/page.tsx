import { Suspense } from 'react';
import { SetupProfileClient } from './SetupProfileClient';

export const dynamic = 'force-dynamic';

export default function SetupProfile() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <SetupProfileClient />
    </Suspense>
  );
}
