import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
    attachReturnSerials,
    confirmReturnBatch,
    createReturnBatch,
    detachReturnSerial,
    getReturnBatchById,
    getReturnBatches,
    markReturnBatchReturned,
    updateReturnBatch,
    updateReturnBatchLineStatus,
} from '../services/returnBatchService';
import type {
    AttachReturnSerialsPayload,
    ConfirmReturnBatchPayload,
    CreateReturnBatchPayload,
    ReturnBatchLineStatus,
    ReturnBatchListParams,
    ReturnBatchStatus,
    UpdateReturnBatchPayload,
} from '../types/returnBatch.type';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useReturnBatches = (params?: ReturnBatchListParams, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.RETURN_BATCHES, params],
        queryFn: () => getReturnBatches(params),
        select: (res: any) => res.data,
        ...options,
    });
};

export const useReturnBatchDetail = (id?: string | number) => {
    const normalizedId =
        id !== undefined && id !== null && String(id).trim() !== '' ? String(id) : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, normalizedId],
        queryFn: () => getReturnBatchById(normalizedId!),
        enabled: !!normalizedId,
        select: (res: any) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
    });
};

export const useCreateReturnBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateReturnBatchPayload) => createReturnBatch(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useUpdateReturnBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number | string; payload: UpdateReturnBatchPayload }) =>
            updateReturnBatch(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.id)] });
        },
    });
};

export const useAttachReturnSerials = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            batchId,
            lineId,
            payload,
        }: {
            batchId: number | string;
            lineId: number | string;
            payload: AttachReturnSerialsPayload;
        }) => attachReturnSerials(batchId, lineId, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.batchId)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useDetachReturnSerial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            batchId,
            lineId,
            serialId,
        }: {
            batchId: number | string;
            lineId: number | string;
            serialId: number | string;
        }) => detachReturnSerial(batchId, lineId, serialId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.batchId)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useUpdateReturnBatchLineStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            batchId,
            lineId,
            status,
        }: {
            batchId: number | string;
            lineId: number | string;
            status: ReturnBatchLineStatus;
        }) => updateReturnBatchLineStatus(batchId, lineId, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.batchId)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useMarkReturnBatchReturned = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => markReturnBatchReturned(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(id)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useConfirmReturnBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: number | string;
            payload?: ConfirmReturnBatchPayload;
        }) => confirmReturnBatch(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.id)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

interface IReturnBatchFilters {
    search?: string;
    status?: ReturnBatchStatus | '';
    page: number;
    size: number;
}

export const useReturnBatchList = () => {
    const [filters, setFilters] = useState<IReturnBatchFilters>({
        search: '',
        status: '',
        page: 1,
        size: 10,
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status: filters.status || undefined,
            page: filters.page,
            size: filters.size,
            sortBy: 'drawDate',
            direction: 'desc',
        }),
        [filters]
    );

    const { data, isLoading, error } = useReturnBatches(queryParams, {
        placeholderData: keepPreviousData,
    });

    const batches = useMemo(() => (data as any)?.recordList ?? [], [data]);
    const pagination = (data as any)?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    return {
        batches,
        pagination,
        isLoading,
        error,
        filters,
        setSearch: (search: string) => setFilters((prev) => ({ ...prev, search, page: 1 })),
        setStatus: (status: ReturnBatchStatus | '') =>
            setFilters((prev) => ({ ...prev, status, page: 1 })),
        setPage: (page: number) => setFilters((prev) => ({ ...prev, page })),
        setLimit: (size: number) => setFilters((prev) => ({ ...prev, size, page: 1 })),
    };
};
