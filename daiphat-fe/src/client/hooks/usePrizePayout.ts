"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { prizePayoutService } from '../services/prizePayoutService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { ApiResponse } from '../../types/api.type';
import {
    CreatePrizePayoutRequest,
    GetMyPrizePayoutsParams,
    PrizePayoutRequestResponse,
    PrizePayoutRequestStatus,
} from '../../types/prize-payout.type';
import { AppToast as toast } from '../../utils/toast.util';

/** Poll while staff may still change status (approve / transfer). */
const PRIZE_PAYOUT_LIVE_REFETCH_MS = 3_000;
const PRIZE_PAYOUT_LIST_REFETCH_MS = 10_000;
const PRIZE_PAYOUT_PENDING_COUNT_REFETCH_MS = 15_000;

const IN_PROGRESS_STATUSES = new Set<PrizePayoutRequestStatus>([
    PrizePayoutRequestStatus.PENDING,
    PrizePayoutRequestStatus.APPROVED,
]);

const isInProgressStatus = (status?: PrizePayoutRequestStatus | string | null) =>
    !!status && IN_PROGRESS_STATUSES.has(status as PrizePayoutRequestStatus);

export const useGetMyPrizePayouts = (params: GetMyPrizePayoutsParams, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUTS, params],
        queryFn: () => prizePayoutService.getMyRequests(params),
        enabled,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            if (!enabled || query.state.error) {
                return false;
            }
            return PRIZE_PAYOUT_LIST_REFETCH_MS;
        },
        refetchIntervalInBackground: false,
    });
};

export const useGetPrizePayoutDetail = (id: number) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_DETAIL, id],
        queryFn: async () => {
            const response = await prizePayoutService.getById(id);
            // Keep list / sidebar badge in sync when status advances on this page.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUTS] }),
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_PENDING_COUNT] }),
            ]);
            return response;
        },
        enabled: !!id && Number.isFinite(id) && id > 0,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            if (query.state.error) {
                return false;
            }
            const status = query.state.data?.data?.status;
            // Keep polling until we know the status, then only while still in progress.
            if (!status || isInProgressStatus(status)) {
                return PRIZE_PAYOUT_LIVE_REFETCH_MS;
            }
            return false;
        },
        refetchIntervalInBackground: false,
    });
};

export const useGetPrizePayoutStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_STATUSES],
        queryFn: () => prizePayoutService.getStatuses(),
    });
};

export const useMyPrizePayoutPendingCount = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_PENDING_COUNT],
        queryFn: () => prizePayoutService.getPendingCount(),
        refetchOnWindowFocus: true,
        refetchInterval: (query) => (query.state.error ? false : PRIZE_PAYOUT_PENDING_COUNT_REFETCH_MS),
        refetchIntervalInBackground: false,
    });
};

const RECOVERY_LOOKUP_ATTEMPTS = 3;
const RECOVERY_LOOKUP_DELAY_MS = 2_000;

/** Timeouts/network drops and 400/5xx can hide a request the server already committed (e.g. a retry after timeout). */
const mayHaveBeenCommitted = (error: any): boolean => {
    const status = error?.response?.status;
    return status == null || status === 400 || status >= 500;
};

const findCommittedRequest = async (
    data: CreatePrizePayoutRequest,
    serverMayStillBeWorking: boolean
): Promise<PrizePayoutRequestResponse | null> => {
    const attempts = serverMayStillBeWorking ? RECOVERY_LOOKUP_ATTEMPTS : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, RECOVERY_LOOKUP_DELAY_MS));
        }
        try {
            const existing = await prizePayoutService.findActiveRequestForTicket(data);
            if (existing) return existing;
        } catch {
            // The original create error is more useful to the user than a failed lookup.
        }
    }
    return null;
};

export const useCreatePrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreatePrizePayoutRequest): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
            try {
                return await prizePayoutService.create(data);
            } catch (error: any) {
                if (!mayHaveBeenCommitted(error)) throw error;
                const existing = await findCommittedRequest(data, error?.response == null);
                if (!existing) throw error;
                return {
                    success: true,
                    message: 'Yêu cầu trả thưởng cho vé này đã được ghi nhận.',
                    data: existing,
                };
            }
        },
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Yêu cầu đã gửi');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUTS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_PENDING_COUNT] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_TICKETS] });
            } else {
                toast.error(response.message || 'Không thể gửi yêu cầu');
            }
        },
        onError: (error: any) => {
            if (error?.response == null) {
                toast.error(
                    'Máy chủ xử lý ảnh CCCD quá lâu hoặc mất kết nối. Vui lòng kiểm tra mục Yêu cầu trả thưởng trước khi gửi lại.'
                );
                return;
            }
            toast.error(error?.response?.data?.message || error.message || 'Lỗi kết nối');
        },
    });
};

export const useCancelPrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => prizePayoutService.cancel(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Đã hủy yêu cầu');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUTS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_DETAIL, id] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_PENDING_COUNT] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_TICKETS] });
            } else {
                toast.error(response.message || 'Không thể hủy yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error.message || 'Lỗi kết nối');
        },
    });
};
