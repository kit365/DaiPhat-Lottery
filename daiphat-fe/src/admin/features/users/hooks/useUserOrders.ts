"use client";

import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/admin/features/orders/services/orderService';
import { userOrdersQueryKey } from '@/admin/features/users/constants/queryKeys';
import type { ApiResponse, PageResponse } from '@/types/api.type';
import type { OrderFilterParams, OrderResponse } from '@/types/order.type';
import { listQueryDefaults } from '@/shared/react-query';

export const useUserOrders = (userId: string, page: number, rowsPerPage: number) => {
    return useQuery({
        queryKey: userOrdersQueryKey(userId, page, rowsPerPage),
        queryFn: () =>
            getOrders({
                userId,
                page: page + 1,
                limit: rowsPerPage,
            } as OrderFilterParams & { userId: string }),
        enabled: !!userId,
        ...listQueryDefaults,
        select: (response: ApiResponse<PageResponse<OrderResponse>> | undefined) => ({
            orders: response?.data?.recordList ?? [],
            pagination: response?.data?.pagination ?? { totalRecords: 0 },
        }),
    });
};
