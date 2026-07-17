import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { supportTicketAdminApi } from '../services/supportTicketService';
import { QUERY_KEYS } from '../constants/queryKeys';
import {
    CreateSupportTicketCommentRequest,
    GetStaffTicketsParams,
    ResolveSupportTicketRequest,
} from '../../../../types/support.type';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

export const useGetStaffTickets = (params: GetStaffTicketsParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS, params],
        queryFn: () => supportTicketAdminApi.getStaffTickets(params),
    });
};

export const useGetStaffTicketDetail = (id: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_DETAIL, id],
        queryFn: () => supportTicketAdminApi.getTicketById(id),
        enabled: !!id,
    });
};

export const useGetStaffTicketComments = (ticketId: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, ticketId],
        queryFn: () => supportTicketAdminApi.getComments(ticketId),
        enabled: !!ticketId,
    });
};

export const useGetAdminTicketCategories = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_TICKET_CATEGORIES],
        queryFn: () => supportTicketAdminApi.getCategories(),
    });
};

export const useAssignSupportTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => supportTicketAdminApi.assignTicket(id),
        onSuccess: (response, id) => {
            if (response.success) {
                toast.success(response.message || 'Tiếp nhận yêu cầu thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_DETAIL, id] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, id] });
            } else {
                toast.error(response.message || 'Không thể tiếp nhận yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useResolveSupportTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: ResolveSupportTicketRequest }) =>
            supportTicketAdminApi.resolveTicket(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Giải quyết yêu cầu thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_DETAIL, variables.id],
                });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, variables.id],
                });
            } else {
                toast.error(response.message || 'Không thể giải quyết yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useSendStaffTicketComment = () => {
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
        }) => supportTicketAdminApi.addComment(ticketId, data, file),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Gửi tin nhắn thành công');
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, variables.ticketId],
                });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_DETAIL, variables.ticketId],
                });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi tin nhắn');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};
