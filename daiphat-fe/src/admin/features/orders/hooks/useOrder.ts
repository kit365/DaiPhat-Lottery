import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from 'react';
import {
    getOrders,
    getOrderDetail,
    updateOrderStatus,
    createOrder,
} from "../services/orderService";
import { OrderFilterParams } from '../../../../types/order.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { QUERY_KEYS as GLOBAL_QUERY_KEYS } from '../../../../constants/queryKeys';

type AdminOrderListFilters = OrderFilterParams & { limit?: number };

export const useAdminOrderList = (initialParams?: OrderFilterParams) => {
    const [filters, setFilters] = useState<AdminOrderListFilters>({
        page: 1,
        limit: 10,
        size: 10,
        ...initialParams,
    });

    const queryInfo = useQuery({
        queryKey: [QUERY_KEYS.ORDERS, filters],
        queryFn: () => getOrders(filters),
        placeholderData: keepPreviousData,
    });

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => {
            const newFilters = { ...prev, page: 1 };

            switch (fieldId) {
                case 'status':
                    newFilters.status = values.length > 0 ? values : undefined;
                    break;
                case 'orderType':
                    newFilters.orderType = values.length > 0 ? values : undefined;
                    break;
                case 'receiveType':
                    newFilters.receiveType = values.length > 0 ? values : undefined;
                    break;
                case 'dateRange': {
                    if (!values.length) {
                        newFilters.fromDate = undefined;
                        newFilters.toDate = undefined;
                        break;
                    }

                    const monthRange = values.find((v) => v.startsWith('month:'));
                    if (monthRange) {
                        const [, from, to] = monthRange.split(':');
                        newFilters.fromDate = from;
                        newFilters.toDate = to;
                        break;
                    }

                    const sorted = [...values].filter((v) => !v.startsWith('month:')).sort();
                    if (sorted.length === 0) {
                        newFilters.fromDate = undefined;
                        newFilters.toDate = undefined;
                    } else {
                        newFilters.fromDate = sorted[0];
                        newFilters.toDate = sorted[sorted.length - 1];
                    }
                    break;
                }
            }
            return newFilters;
        });
    };

    const clearFilters = () => {
        const limit = filters.limit ?? filters.size ?? 10;
        setFilters({ page: 1, limit, size: limit });
    };

    const setSortBy = (sortByUI: string) => {
        setFilters((prev) => {
            const newFilters = { ...prev, page: 1 };
            if (sortByUI === 'default' || sortByUI === 'newest') {
                newFilters.sortBy = 'createdAt';
                newFilters.direction = 'DESC';
            } else if (sortByUI === 'pickup_asc') {
                newFilters.sortBy = 'expectedPickupAt';
                newFilters.direction = 'ASC';
            } else if (sortByUI === 'price_desc') {
                newFilters.sortBy = 'totalAmount';
                newFilters.direction = 'DESC';
            } else if (sortByUI === 'price_asc') {
                newFilters.sortBy = 'totalAmount';
                newFilters.direction = 'ASC';
            }
            return newFilters;
        });
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => ({ ...prev, limit, size: limit, page: 1 }));
    };

    let sortByUI = 'default';
    if (filters.sortBy === 'createdAt' && filters.direction === 'DESC') sortByUI = 'newest';
    else if (filters.sortBy === 'expectedPickupAt' && filters.direction === 'ASC') sortByUI = 'pickup_asc';
    else if (filters.sortBy === 'totalAmount' && filters.direction === 'DESC') sortByUI = 'price_desc';
    else if (filters.sortBy === 'totalAmount' && filters.direction === 'ASC') sortByUI = 'price_asc';

    return {
        orders: queryInfo.data?.data?.recordList || [],
        pagination: queryInfo.data?.data?.pagination,
        statusCounts: queryInfo.data?.data?.statusCounts,
        isLoading: queryInfo.isLoading,
        error: queryInfo.error,
        filters,
        sortByUI,
        setFilter,
        clearFilters,
        setSearchFilter,
        setSortBy,
        setPage,
        setLimit,
        refetch: queryInfo.refetch,
    };
};

export const useOrderDetail = (id: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ORDER_DETAIL, id],
        queryFn: () => getOrderDetail(id),
        enabled: !!id,
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
            updateOrderStatus(id, status, reason),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDER_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.ADMIN_NOTIFICATIONS] });
        },
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: unknown) => createOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};
