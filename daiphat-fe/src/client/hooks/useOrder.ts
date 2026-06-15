import { useMutation, useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { CreateOnlineOrderRequest, GetMyOrdersParams } from '../../types/order.type';
import { AppToast as toast } from '../utils/toast.util';

export const useCreateOnlineOrder = () => {
    return useMutation({
        mutationFn: (data: CreateOnlineOrderRequest) => orderService.createOnlineOrder(data),
        onSuccess: (response) => {
            if (!response.success) {
                toast.error(response.message || 'Có lỗi xảy ra khi tạo đơn hàng');
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Lỗi kết nối đến máy chủ';
            toast.error(message);
        }
    });
};

export const useGetOrderReceiveTypes = () => {
    return useQuery({
        queryKey: ['orderReceiveTypes'],
        queryFn: () => orderService.getOrderReceiveTypes()
    });
};

export const useGetOrderStatuses = () => {
    return useQuery({
        queryKey: ['orderStatuses'],
        queryFn: () => orderService.getOrderStatuses()
    });
};

export const useGetMyOrders = (params: GetMyOrdersParams) => {
    return useQuery({
        queryKey: ['myOrders', params],
        queryFn: () => orderService.getMyOrders(params)
    });
};
