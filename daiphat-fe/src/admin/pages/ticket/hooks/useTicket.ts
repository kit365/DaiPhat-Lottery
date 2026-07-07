import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTickets,
    getCreateTicketData,
    createTicket,
    bulkCreateTickets,
    getImportedTicketsByLine,
    updateImportedTicketDuringBatch,
    hardDeleteImportedTicketDuringBatch,
    type UpdateImportedTicketPayload,
    getTicketById,
    updateTicket,
    deleteTicket,
    restoreTicket,
    forceDeleteTicket,
    scanExpiredTickets,
    uploadTicketImage,
    uploadTicketSerialImage
} from '../../../api/ticket.api';
import { ApiResponse } from '../../../config/type';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

// --- TICKETS ---
export const useTicketList = (params?: any, options?: any) => {
    return useQuery({
        queryKey: ['tickets', params],
        queryFn: () => getTickets(params),
        ...options,
    });
};

export const useCreateTicketData = () => {
    return useQuery({
        queryKey: ['ticket-create-data'],
        queryFn: getCreateTicketData,
        select: (res: ApiResponse<any>) => res.data,
    });
};

export const useTicketDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['ticket', id],
        queryFn: () => getTicketById(id!),
        enabled: !!id,
        select: (res: ApiResponse<any>) => res.data,
    });
};

export const useImportedTicketsByLine = (importBatchLineId?: string | number) => {
    const normalizedLineId =
        importBatchLineId !== undefined && importBatchLineId !== null && String(importBatchLineId).trim() !== ''
            ? String(importBatchLineId)
            : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.IMPORTED_TICKETS_BY_LINE, normalizedLineId],
        queryFn: () => getImportedTicketsByLine(normalizedLineId!),
        enabled: !!normalizedLineId,
        select: (res: ApiResponse<any>) => res.data ?? [],
        staleTime: 0,
        refetchOnMount: 'always',
    });
};

const invalidateImportEntryQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORTED_TICKETS_BY_LINE] });
};

export const useUpdateImportedTicketDuringBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: {
            ticketId: string | number;
            importBatchLineId: string | number;
            data: UpdateImportedTicketPayload;
        }) =>
            updateImportedTicketDuringBatch(
                variables.ticketId,
                variables.importBatchLineId,
                variables.data
            ),
        onSuccess: () => {
            invalidateImportEntryQueries(queryClient);
        },
    });
};

export const useHardDeleteImportedTicketDuringBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { ticketId: string | number; importBatchLineId: string | number }) =>
            hardDeleteImportedTicketDuringBatch(variables.ticketId, variables.importBatchLineId),
        onSuccess: () => {
            invalidateImportEntryQueries(queryClient);
        },
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
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKET_ENTRY_DRAFTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORTED_TICKETS_BY_LINE] });
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
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKET_ENTRY_DRAFTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORTED_TICKETS_BY_LINE] });
        },
    });
};

export const useUpdateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateTicket(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
        },
    });
};

export const useDeleteTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};

export const useRestoreTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};

export const useForceDeleteTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: forceDeleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};

export const useScanExpiredTickets = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanExpiredTickets,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['expired-tickets'] });
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


// --- AGE RANGES (Placeholders - Lottery usually doesn't have age ranges, but keeping for compatibility) ---
export const useTicketAgeRanges = () => {
    return useQuery({
        queryKey: ['ticket-age-ranges'],
        queryFn: async () => ({ data: [] }),
        select: (res: any) => res.data || [],
    });
};

export const useTicketAgeRangeDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['ticket-age-range', id],
        queryFn: async () => ({ data: null }),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateTicketAgeRange = () => {
    return useMutation({
        mutationFn: async (data: any) => ({ success: true, data, message: "Success" }),
    });
};

export const useUpdateTicketAgeRange = () => {
    return useMutation({
        mutationFn: async ({ id, data }: { id: string | number; data: any }) => ({ success: true, id, data, message: "Success" }),
    });
};

export const useDeleteTicketAgeRange = () => {
    return useMutation({
        mutationFn: async (id: string | number) => ({ success: true, id, message: "Success" }),
    });
};
