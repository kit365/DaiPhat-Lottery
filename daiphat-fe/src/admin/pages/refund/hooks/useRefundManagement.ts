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
