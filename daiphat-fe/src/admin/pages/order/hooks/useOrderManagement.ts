import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    getOrders,
    getOrderDetail,
    updateOrderStatus,
    createOrder,
    updateOrder
} from "../../../api/order.api";
import { useState } from 'react';
import { OrderFilterParams } from '../../../../types/order.type';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

export const useAdminOrderList = (initialParams?: OrderFilterParams) => {
    const [filters, setFilters] = useState<OrderFilterParams>({
        page: 1,
        limit: 10,
        ...initialParams,
    } as any);

    const queryInfo = useQuery<any>({
        queryKey: [QUERY_KEYS.ADMIN_ORDERS, filters],
        queryFn: () => getOrders(filters),
        placeholderData: keepPreviousData,
    });

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters(prev => {
            const newFilters = { ...prev, page: 1 };
            
            switch(fieldId) {
                case 'status':
                    newFilters.status = values.length > 0 ? values : undefined;
                    break;
                case 'orderType':
                    newFilters.orderType = values.length > 0 ? values : undefined;
                    break;
                case 'receiveType':
                    newFilters.receiveType = values.length > 0 ? values : undefined;
                    break;
                case 'dateRange':
                    if (values[0]) {
                        newFilters.fromDate = values[0];
                        newFilters.toDate = values[0];
                    } else {
                        newFilters.fromDate = undefined;
                        newFilters.toDate = undefined;
                    }
                    break;
            }
            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters({ page: 1, limit: filters.limit as number });
    };

    const setSortBy = (sortByUI: string) => {
        setFilters(prev => {
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
        setFilters(prev => ({ ...prev, search, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters(prev => ({ ...prev, limit, page: 1 }));
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
        refetch: queryInfo.refetch
    };
};

export const useOrders = (params?: any) => {
    return useQuery<any>({
        queryKey: [QUERY_KEYS.ADMIN_ORDERS, params],
        queryFn: () => getOrders(params),
        placeholderData: keepPreviousData,
    });
};

export const useOrderDetail = (id: string) => {
    return useQuery<any>({
        queryKey: [QUERY_KEYS.ADMIN_ORDER_DETAIL, id],
        queryFn: () => getOrderDetail(id),
        enabled: !!id,
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) => updateOrderStatus(id, status, reason),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDER_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
        },
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDERS] });
        },
    });
};

export const useUpdateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateOrder(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDER_DETAIL, variables.id] });
        },
    });
};
