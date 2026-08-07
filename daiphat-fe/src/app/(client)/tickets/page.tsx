import { Suspense } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { BuyTicketPage } from '@/client/features/buy-ticket/BuyTicketPage';
import {
    getPublicStationsToday,
    getPublicStationsTomorrow,
} from '@/shared/station/scheduleApi';

export const revalidate = 60;

export default async function TicketsPage() {
    const queryClient = new QueryClient();

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: ['public-stations-today'],
            queryFn: getPublicStationsToday,
        }),
        queryClient.prefetchQuery({
            queryKey: ['public-stations-tomorrow'],
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
