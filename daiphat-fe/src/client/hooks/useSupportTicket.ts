"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportTicketService } from '../services/supportTicketService';
import {
    CreateSupportTicketCommentRequest,
    CreateSupportTicketRequest,
    GetMyTicketsParams,
    UpdateSupportTicketRequest,
} from '../../types/support.type';
import { AppToast as toast } from '../../utils/toast.util';
import { QUERY_KEYS } from '../../constants/queryKeys';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

const SUPPORT_TICKET_LIVE_REFETCH_MS = 3000;

export const useGetTicketCategories = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_TICKET_CATEGORIES],
        queryFn: () => supportTicketService.getCategories(),
    });
};

export const useGetOrderComplaintEligibility = (orderId?: string, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ORDER_COMPLAINT_ELIGIBILITY, orderId],
        queryFn: () => supportTicketService.getOrderComplaintEligibility(orderId!),
        enabled: !!orderId && enabled,
        refetchInterval: 30_000,
    });
};

export const useGetMyTickets = (params: GetMyTicketsParams, enabled = true) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS, params],
        queryFn: async () => {
            const response = await supportTicketService.getMyTickets(params);
            // List view acknowledges REJECTED badges on BE — refresh sidebar count.
            await queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS, 'active-count'],
            });
            return response;
        },
        enabled,
    });
};

export const useGetComplaintDetail = (id: number) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_COMPLAINT_DETAIL, id],
        queryFn: async () => {
            const response = await supportTicketService.getById(id);
            await queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS, 'active-count'],
            });
            return response;
        },
        enabled: Number.isFinite(id) && id > 0,
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: SUPPORT_TICKET_LIVE_REFETCH_MS,
    });
};

export const useGetTicketComments = (ticketId: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_TICKET_COMMENTS, ticketId],
        queryFn: () => supportTicketService.getComments(ticketId),
        enabled: !!ticketId,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: SUPPORT_TICKET_LIVE_REFETCH_MS,
    });
};

export const useSendTicketComment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            ticketId,
            data,
            file,
        }: {
            ticketId: number;
            data: CreateSupportTicketCommentRequest;
            file?: File | null;
        }) => supportTicketService.addComment(ticketId, data, file),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Gửi tin nhắn thành công');
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_TICKET_COMMENTS, variables.ticketId],
                });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_COMPLAINT_DETAIL, variables.ticketId],
                });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi tin nhắn');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useCreateComplaint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data, file }: { data: CreateSupportTicketRequest; file?: File | null }) =>
            supportTicketService.create(data, file),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Tạo yêu cầu hỗ trợ thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi tạo yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useUpdateComplaint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
            file,
        }: {
            id: number;
            data: UpdateSupportTicketRequest;
            file?: File | null;
        }) => supportTicketService.update(id, data, file),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Cập nhật yêu cầu hỗ trợ thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_COMPLAINT_DETAIL, variables.id],
                });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi cập nhật');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useCloseComplaint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => supportTicketService.close(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Huỷ khiếu nại thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_COMPLAINT_DETAIL, id] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_TICKET_COMMENTS, id] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi huỷ khiếu nại');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useSubmitResolutionFeedback = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, satisfied }: { id: number; satisfied: boolean }) =>
            supportTicketService.submitResolutionFeedback(id, satisfied),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(
                    response.message ||
                        (variables.satisfied
                            ? 'Cảm ơn bạn đã xác nhận. Yêu cầu đã được đóng.'
                            : 'Yêu cầu đã được mở lại để tiếp tục xử lý.')
                );
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_COMPLAINT_DETAIL, variables.id],
                });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_TICKET_COMMENTS, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể gửi phản hồi đánh giá');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};
