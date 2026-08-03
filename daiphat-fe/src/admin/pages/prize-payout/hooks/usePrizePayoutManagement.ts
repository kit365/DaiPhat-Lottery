"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { prizePayoutAdminApi } from '../../../api/prizePayout.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import {
    CompletePrizePayoutRequest,
    GetStaffPrizePayoutsParams,
    RejectPrizePayoutRequest,
} from '../../../../types/prize-payout.type';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

export const useGetStaffPrizePayouts = (params: GetStaffPrizePayoutsParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS, params],
        queryFn: () => prizePayoutAdminApi.getStaffRequests(params),
        refetchOnWindowFocus: true,
        staleTime: 0,
    });
};

export const useGetStaffPrizePayoutDetail = (id: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUT_DETAIL, id],
        queryFn: () => prizePayoutAdminApi.getById(id),
        enabled: !!id,
    });
};

export const useCompletePrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CompletePrizePayoutRequest }) =>
            prizePayoutAdminApi.complete(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Xác nhận chuyển khoản thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUT_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể xác nhận chuyển khoản');
            }
        },
        onError: (error: any) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useRejectPrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: RejectPrizePayoutRequest }) =>
            prizePayoutAdminApi.reject(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Đã từ chối yêu cầu');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUT_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể từ chối yêu cầu');
            }
        },
        onError: (error: any) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};
