import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { refundAdminApi } from '../../../api/refund.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import {
    GetStaffRefundsParams,
    RejectRefundRequestRequest,
    TransferRefundRequestRequest,
} from '../../../../types/refund.type';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

export const useGetStaffRefunds = (params: GetStaffRefundsParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_REFUNDS, params],
        queryFn: () => refundAdminApi.getStaffRefunds(params),
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
        refetchInterval: 15_000,
        staleTime: 0,
    });
};

export const useGetStaffRefundDetail = (id: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, id],
        queryFn: () => refundAdminApi.getRefundById(id),
        enabled: !!id,
    });
};

export const useApproveRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => refundAdminApi.approveRefund(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Duyệt yêu cầu hoàn tiền thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, id] });
            } else {
                toast.error(response.message || 'Không thể duyệt yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useRejectRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: RejectRefundRequestRequest }) =>
            refundAdminApi.rejectRefund(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Đã từ chối yêu cầu hủy');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể từ chối yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useTransferRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TransferRefundRequestRequest }) =>
            refundAdminApi.transferRefund(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Xác nhận chuyển khoản thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể xác nhận chuyển khoản');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useAttachRefundBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, bankAccountId }: { id: number; bankAccountId: number }) =>
            refundAdminApi.attachBankAccount(id, { bankAccountId }),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Đã gắn tài khoản ngân hàng');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể gắn tài khoản');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useCancelOrderWithRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            orderId,
            cancelReason,
        }: {
            orderId: string;
            cancelReason: string;
        }) => refundAdminApi.cancelOrderWithRefund(orderId, { cancelReason }),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Đã hủy đơn và tạo yêu cầu hoàn tiền');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDERS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDER_DETAIL] });
            } else {
                toast.error(response.message || 'Không thể hủy đơn với hoàn tiền');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};
