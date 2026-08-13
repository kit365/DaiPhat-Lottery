import { Suspense } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { BuyTicketPage } from '@/client/features/buy-ticket/BuyTicketPage';
import {
    getPublicStationsToday,
    getPublicStationsTomorrow,
} from '@/shared/station/scheduleApi';
import { publicStationsQueryKeys } from '@/constants/queryKeys';

export const revalidate = 60;

export default async function TicketsPage() {
    const queryClient = new QueryClient();

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: publicStationsQueryKeys.today(),
            queryFn: getPublicStationsToday,
        }),
        queryClient.prefetchQuery({
            queryKey: publicStationsQueryKeys.tomorrow(),
            queryFn: getPublicStationsTomorrow,
        }),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
                <BuyTicketPage />
            </Suspense>
        </HydrationBoundary>
    );
}
