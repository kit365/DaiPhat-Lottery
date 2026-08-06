import { Suspense } from 'react';
import { SchedulePage } from '@/client/features/schedule';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

export default function Schedule() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SchedulePage />
    </Suspense>
  );
}
