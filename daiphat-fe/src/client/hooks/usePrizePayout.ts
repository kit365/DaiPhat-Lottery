import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { prizePayoutService } from '../services/prizePayoutService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { CreatePrizePayoutRequest, GetMyPrizePayoutsParams } from '../../types/prize-payout.type';
import { AppToast as toast } from '../../utils/toast.util';

export const useGetMyPrizePayouts = (params: GetMyPrizePayoutsParams, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUTS, params],
        queryFn: () => prizePayoutService.getMyRequests(params),
        enabled,
    });
};

export const useGetPrizePayoutDetail = (id: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PRIZE_PAYOUT_DETAIL, id],
        queryFn: () => prizePayoutService.getById(id),
        enabled: !!id,
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
    });
};

export const useCreatePrizePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePrizePayoutRequest) => prizePayoutService.create(data),
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
