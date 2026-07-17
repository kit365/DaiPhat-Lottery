import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTickets,
    createTicket,
    bulkCreateTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    restoreTicket,
    forceDeleteTicket,
    scanExpiredTickets,
    uploadTicketImage,
    uploadTicketSerialImage
} from '../services/ticketService';
import { ApiResponse } from '../../../../../types/api.type';
import { QUERY_KEYS as GLOBAL_QUERY_KEYS } from '../../../../../constants/queryKeys';
import { QUERY_KEYS } from '../constants/queryKeys';

/** List vé theo params — cùng pattern `useStations(params)`. */
export const useTickets = (params?: any, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.TICKETS, params],
        queryFn: () => getTickets(params),
        ...options,
    });
};

export const useTicketDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.TICKET_DETAIL, id],
        queryFn: () => getTicketById(id!),
        enabled: !!id,
        select: (res: ApiResponse<any>) => res.data,
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { data: any; skipGlobalErrorToast?: boolean } | any) => {
            if (variables && typeof variables === 'object' && 'data' in variables) {
                return createTicket(variables.data, {
                    skipGlobalErrorToast: variables.skipGlobalErrorToast,
                });
            }
            return createTicket(variables);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
        },
    });
};

export const useBulkCreateTickets = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { data: any; skipGlobalErrorToast?: boolean }) =>
            bulkCreateTickets(variables.data, {
                skipGlobalErrorToast: variables.skipGlobalErrorToast,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
        },
    });
};

export const useUpdateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateTicket(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKET_DETAIL, variables.id] });
        },
    });
};

export const useDeleteTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
        },
    });
};

export const useRestoreTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
        },
    });
};

export const useForceDeleteTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: forceDeleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
        },
    });
};

export const useScanExpiredTickets = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanExpiredTickets,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXPIRED_TICKETS] });
            queryClient.invalidateQueries({ queryKey: ['ticket-expired-list'] });
        },
    });
};

export const useUploadTicketImage = () => {
    return useMutation({
        mutationFn: ({ id, file }: { id: string | number; file: File }) => uploadTicketImage(id, file),
    });
};


export const useUploadTicketSerialImage = () => {
    return useMutation({
        mutationFn: ({ id, file }: { id: string | number; file: File }) => uploadTicketSerialImage(id, file),
    });
};
