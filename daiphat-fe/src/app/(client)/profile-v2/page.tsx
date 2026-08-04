import { Suspense } from 'react';
import { ProfileV2Client } from './ProfileV2Client';

export const dynamic = 'force-dynamic';

export default function ProfileV2() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ProfileV2Client />
    </Suspense>
  );
}
