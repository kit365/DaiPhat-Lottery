import { Suspense } from 'react';

import { SchedulePage } from '@/client/features/schedule';

export const dynamic = 'force-dynamic';

export default function ScheduleRoutePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
            <SchedulePage />
        </Suspense>
    );
}
