"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { prizePayoutAdminApi } from '../../../api/prizePayout.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import {
    CompletePrizePayoutRequest,
    CreateStaffPrizePayoutBatchRequest,
    CreateStaffPrizePayoutRequest,
    GetStaffPrizePayoutsParams,
    RejectPrizePayoutRequest,
} from '../../../../types/prize-payout.type';
import { invalidateAdminBadgeCounts } from '../../../utils/invalidateAdminBadgeCounts';

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

export const useCreateStaffPrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStaffPrizePayoutRequest) => prizePayoutAdminApi.createInPerson(data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Đã tạo yêu cầu trả thưởng tại quầy');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                invalidateAdminBadgeCounts(queryClient);
            } else {
                toast.error(response.message || 'Không thể tạo yêu cầu');
            }
        },
        onError: (error: any) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useCreateStaffPrizePayoutBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStaffPrizePayoutBatchRequest) => prizePayoutAdminApi.createInPersonBatch(data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Đã gửi yêu cầu trả thưởng — chờ duyệt');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                invalidateAdminBadgeCounts(queryClient);
            } else {
                toast.error(response.message || 'Không thể tạo yêu cầu');
            }
        },
        onError: (error: any) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useApprovePrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => prizePayoutAdminApi.approve(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Đã duyệt yêu cầu trả thưởng');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUT_DETAIL, id],
                });
            } else {
                toast.error(response.message || 'Không thể duyệt yêu cầu');
            }
        },
        onError: (error: any) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useCompletePrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CompletePrizePayoutRequest }) =>
            prizePayoutAdminApi.complete(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Xác nhận trả thưởng thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS] });
                invalidateAdminBadgeCounts(queryClient);
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUT_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể xác nhận trả thưởng');
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
                invalidateAdminBadgeCounts(queryClient);
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
