import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refundService } from '../services/refundService';
import { orderService } from '../services/orderService';
import { CreateOrderRefundRequest, CreateRefundRequestRequest, GetMyRefundsParams } from '../../types/refund.type';
import { AppToast as toast } from '../../utils/toast.util';
import { QUERY_KEYS } from '../../constants/queryKeys';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.response?.data?.error || error.message || fallback;

const isHandledClientError = (error: any) => {
    const status = error?.response?.status;
    return status === 400 || status === 403 || status === 422 || status === 429;
};

export const useGetMyRefunds = (params: GetMyRefundsParams, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_REFUNDS, params],
        queryFn: () => refundService.getMyRequests(params),
        enabled
    });
};

export const useGetRefundDetail = (id: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_REFUND_DETAIL, id],
        queryFn: () => refundService.getById(id),
        enabled: !!id
    });
};

export const useGetRefundStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_REFUND_STATUSES],
        queryFn: () => refundService.getStatuses()
    });
};

export const useGetRefundTypes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_REFUND_TYPES],
        queryFn: () => refundService.getTypes()
    });
};

export const useCreateRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateRefundRequestRequest) => refundService.create(data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Tạo yêu cầu hoàn tiền thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_REFUNDS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi tạo yêu cầu hoàn tiền');
            }
        },
        onError: (error: any) => {
            if (isHandledClientError(error)) {
                return;
            }
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};

export const useCreateOrderRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: CreateOrderRefundRequest }) =>
            refundService.createOrderRefund(orderId, data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Yêu cầu hoàn tiền đã được gửi và đang chờ duyệt');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_REFUNDS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_ORDERS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_ORDER_DETAIL] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi hủy đơn');
            }
        },
        onError: (error: any) => {
            if (isHandledClientError(error)) {
                return;
            }
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};

export const useGetOrderRefundEligibility = (orderId: string, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ORDER_REFUND_ELIGIBILITY, orderId],
        queryFn: () => orderService.getRefundEligibility(orderId),
        enabled: !!orderId && enabled,
        refetchInterval: enabled ? 30_000 : false,
        refetchOnMount: 'always'
    });
};

export const useCancelRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => refundService.cancel(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Hủy yêu cầu hoàn tiền thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_REFUNDS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_REFUND_DETAIL, id] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi hủy yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};
