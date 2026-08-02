import { use, Suspense } from 'react';
import { ProfileTabClient } from './ProfileTabClient';

export const dynamic = 'force-dynamic';

export default function ProfileTabRoute({ params }: { params: Promise<{ tab?: string[] }> }) {
  const resolvedParams = use(params);
  const tabSegments = resolvedParams.tab || ['overview'];

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ProfileTabClient tabSegments={tabSegments} />
    </Suspense>
  );
}
