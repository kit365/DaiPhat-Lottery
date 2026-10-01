"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { refundAdminApi } from "@/admin/features/refund/services/refundService";
import { QUERY_KEYS } from '@/admin/features/refund/constants/queryKeys';
import { QUERY_KEYS as TICKET_QUERY_KEYS } from '@/admin/features/ticket/inventory/constants/queryKeys';
import { QUERY_KEYS as ORDER_QUERY_KEYS } from '@/admin/features/orders/constants/queryKeys';
import {
    CompleteCounterRefundRequest,
    CreateUserBankAccountRequest,
    GetStaffRefundsParams,
    TransferRefundRequestRequest,
    VerifyRefundCounterIdentityRequest,
} from '@/types/refund.type';
import { invalidateAdminBadgeCounts } from '@/admin/utils/invalidateAdminBadgeCounts';

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

/** Errors are rendered inside the counter dialog (missing CCCD fields, retake sides). */
export const useVerifyCounterIdentity = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: VerifyRefundCounterIdentityRequest }) =>
            refundAdminApi.verifyCounterIdentity(id, data),
        onSettled: (_response, _error, variables) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
            });
        },
    });
};

export const useCompleteCounterRefund = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CompleteCounterRefundRequest }) =>
            refundAdminApi.completeCounterRefund(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Đã hoàn tất hoàn tiền tại quầy');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_REFUNDS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể hoàn tất hoàn tiền tại quầy');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useRefundCustomerBankAccounts = (customerId: string | null | undefined, enabled: boolean) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_REFUND_CUSTOMER_BANK_ACCOUNTS, customerId],
        queryFn: () => refundAdminApi.getCustomerBankAccounts(customerId!),
        enabled: enabled && !!customerId,
    });
};

export const useCreateRefundCustomerBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; customerId: string; data: CreateUserBankAccountRequest }) =>
            refundAdminApi.createCustomerBankAccount(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Đã thêm tài khoản ngân hàng cho khách hàng');
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_REFUND_CUSTOMER_BANK_ACCOUNTS, variables.customerId],
                });
            } else {
                toast.error(response.message || 'Không thể thêm tài khoản ngân hàng');
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
                queryClient.invalidateQueries({ queryKey: [ORDER_QUERY_KEYS.ORDERS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({ queryKey: [ORDER_QUERY_KEYS.ORDER_DETAIL] });
                queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
                queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKET_DETAIL] });
            } else {
                toast.error(response.message || 'Không thể hủy đơn với hoàn tiền');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};
