import { Suspense } from 'react';

import { SchedulePage } from '@/client/features/schedule';
import { fetchPublicScheduleServer } from '@/lib/server-schedule';

export const revalidate = 300;

export default async function ScheduleRoutePage() {
    const initialSchedule = await fetchPublicScheduleServer();

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
            <SchedulePage initialSchedule={initialSchedule} />
        </Suspense>
    );
}
