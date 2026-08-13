import type { QueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/queryKeys';
import { orderService } from '@/client/services/orderService';
import { transactionService } from '@/client/services/transactionService';

/** Prefetch enum nhỏ cho form checkout (hình thức nhận vé + thanh toán). */
export const prefetchCheckoutFormOptions = (queryClient: QueryClient): Promise<unknown[]> =>
    Promise.all([
        queryClient.prefetchQuery({
            queryKey: [QUERY_KEYS.CLIENT_ORDER_RECEIVE_TYPES],
            queryFn: () => orderService.getOrderReceiveTypes(),
            staleTime: 1000 * 60 * 30,
        }),
        queryClient.prefetchQuery({
            queryKey: [QUERY_KEYS.CLIENT_TRANSACTION_TYPES],
            queryFn: () => transactionService.getTransactionTypes(),
            staleTime: 1000 * 60 * 30,
        }),
    ]);
