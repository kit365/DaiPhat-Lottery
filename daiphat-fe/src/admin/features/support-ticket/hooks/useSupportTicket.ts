"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { supportTicketAdminApi } from '../services/supportTicketService';
import { QUERY_KEYS } from '../constants/queryKeys';
import {
    GetStaffTicketsParams,
    StaffSupportTicketResponseRequest,
} from '../../../../types/support.type';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

const SUPPORT_TICKET_LIVE_REFETCH_MS = 3000;

const invalidateTicketQueries = (queryClient: ReturnType<typeof useQueryClient>, ticketId?: number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKETS] });
    if (ticketId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_DETAIL, ticketId] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, ticketId] });
    }
};

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
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: SUPPORT_TICKET_LIVE_REFETCH_MS,
    });
};

export const useGetStaffTicketComments = (ticketId: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_SUPPORT_TICKET_COMMENTS, ticketId],
        queryFn: () => supportTicketAdminApi.getComments(ticketId),
        enabled: !!ticketId,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: SUPPORT_TICKET_LIVE_REFETCH_MS,
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
                invalidateTicketQueries(queryClient, id);
            } else {
                toast.error(response.message || 'Không thể tiếp nhận yêu cầu');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};

export const useRespondSupportTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            ticketId,
            data,
            file,
        }: {
            ticketId: number;
            data: StaffSupportTicketResponseRequest;
            file?: File | null;
        }) => supportTicketAdminApi.respondToTicket(ticketId, data, file),
        onSuccess: (response, variables) => {
            if (response.success) {
                toast.success(response.message || 'Gửi phản hồi thành công');
                invalidateTicketQueries(queryClient, variables.ticketId);
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi phản hồi');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        },
    });
};
