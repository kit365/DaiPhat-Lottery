"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { CreateOnlineOrderRequest, GetMyOrdersParams } from '../../types/order.type';
import { AppToast as toast } from '../../utils/toast.util';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { buyTicketQueryKeys } from '../features/buy-ticket/constants/queryKeys';

export const useCreateOnlineOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOnlineOrderRequest) => orderService.createOnlineOrder(data),
        onSuccess: (response) => {
            if (!response.success) {
                toast.error(response.message || 'Có lỗi xảy ra khi tạo đơn hàng');
                return;
            }
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_TICKETS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_LOTTERY_TICKET_SEARCH] });
            queryClient.invalidateQueries({ queryKey: buyTicketQueryKeys.all });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Lỗi kết nối đến máy chủ';
            toast.error(message);
        }
    });
};

export const useGetOrderReceiveTypes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ORDER_RECEIVE_TYPES],
        queryFn: () => orderService.getOrderReceiveTypes()
    });
};

export const useGetOrderStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ORDER_STATUSES],
        queryFn: () => orderService.getOrderStatuses()
    });
};

export const useGetMyOrders = (params: GetMyOrdersParams, enabled: boolean = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_ORDERS, params],
        queryFn: () => orderService.getMyOrders(params),
        enabled
    });
};

export const useGetMyOrderDetail = (id: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_ORDER_DETAIL, id],
        queryFn: () => orderService.getMyOrderDetail(id),
        enabled: !!id,
        retry: false,
    });
};
