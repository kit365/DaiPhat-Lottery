"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
    attachReturnSerials,
    confirmReturnHandover,
    confirmReturnInspection,
    detachReturnSerial,
    getInspectableReturnSerials,
    getReturnBatchById,
    getReturnBatches,
    startReturnInspection,
    updateReturnBatchLineStatus,
} from '../services/returnBatchService';
import type {
    AttachReturnSerialsPayload,
    ConfirmReturnHandoverPayload,
    ConfirmReturnInspectionPayload,
    ReturnBatchLineStatus,
    ReturnBatchListParams,
    ReturnBatchStatus,
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
        refetchInterval: 30_000,
    });
};

export const useInspectableReturnSerials = (batchId?: string | number, enabled = false) => {
    const normalizedId =
        batchId !== undefined && batchId !== null && String(batchId).trim() !== ''
            ? String(batchId)
            : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, normalizedId, 'inspectable'],
        queryFn: () => getInspectableReturnSerials(normalizedId!),
        enabled: !!normalizedId && enabled,
        select: (res) => res.data ?? [],
        staleTime: 0,
    });
};

export const useStartReturnInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => startReturnInspection(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(id)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useConfirmReturnInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: number | string;
            payload: ConfirmReturnInspectionPayload;
        }) => confirmReturnInspection(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.id)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
        },
    });
};

export const useConfirmReturnHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: number | string;
            payload?: ConfirmReturnHandoverPayload;
        }) => confirmReturnHandover(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCH_DETAIL, String(variables.id)] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RETURN_BATCHES] });
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
        refetchInterval: 30_000,
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
