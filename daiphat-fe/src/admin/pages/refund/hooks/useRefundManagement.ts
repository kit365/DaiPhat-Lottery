"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { refundAdminApi } from '../../../api/refund.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import {
    GetStaffRefundsParams,
    TransferRefundRequestRequest,
} from '../../../../types/refund.type';
import { invalidateAdminBadgeCounts } from '../../../utils/invalidateAdminBadgeCounts';

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

export const useTransferRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TransferRefundRequestRequest }) =>
            refundAdminApi.transferRefund(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Xác nhận chuyển khoản thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                invalidateAdminBadgeCounts(queryClient);
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

export const useRequestBankInfoUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, operatorNote }: { id: number; operatorNote: string }) =>
            refundAdminApi.requestBankInfoUpdate(id, { operatorNote }),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(
                    response.message || 'Đã gửi yêu cầu cập nhật tài khoản ngân hàng cho khách hàng'
                );
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
                });
            } else {
                toast.error(
                    response.message || 'Không thể gửi yêu cầu cập nhật tài khoản ngân hàng'
                );
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
            ...payload
        }: {
            orderId: string;
        } & import('../../../../types/refund.type').StaffCancelOrderWithRefundRequest) =>
            refundAdminApi.cancelOrderWithRefund(orderId, payload),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Đã hủy đơn và tạo yêu cầu hoàn tiền');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_ORDERS] });
                invalidateAdminBadgeCounts(queryClient);
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
