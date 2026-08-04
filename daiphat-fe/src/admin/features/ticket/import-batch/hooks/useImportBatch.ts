"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { QUERY_KEYS as TICKET_QUERY_KEYS } from '../../inventory/constants/queryKeys';
import {
    createImportBatch,
    deleteImportBatchLine,
    getActiveImportBatchDraft,
    getImportBatchById,
    getImportBatches,
    getIncompleteImportBatches,
    getImportBatchesWithoutLines,
    getEligibleImportBatchStations,
    getImportBatchTimePolicy,
    getImportBatchLineEntryTickets,
    pauseImportBatchLine,
    resumeImportBatchLine,
    updateImportBatch,
} from '../services/importBatchService';
import type {
    CreateImportBatchPayload,
    ImportBatchListParams,
    UpdateImportBatchPayload,
} from '../types/importBatch.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { ImportBatchImportMode } from '../utils/batchTypeLabels';

export const useActiveImportBatchDraft = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT],
        queryFn: getActiveImportBatchDraft,
        enabled,
        staleTime: 0,
        refetchOnMount: 'always',
        retry: false,
    });
};

export const useImportBatchDetail = (id?: string | number) => {
    const normalizedId =
        id !== undefined && id !== null && String(id).trim() !== '' ? String(id) : undefined;

    const query = useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL, normalizedId],
        queryFn: () => getImportBatchById(normalizedId!),
        enabled: !!normalizedId,
        select: (res) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
        retry: (failureCount, error: any) => {
            const status = error?.response?.status;
            if (status === 404 || status === 403) {
                return false;
            }
            return failureCount < 2;
        },
    });

    const data =
        query.data && normalizedId && String(query.data.id) === normalizedId
            ? query.data
            : undefined;

    const isLoading =
        !!normalizedId &&
        (query.isLoading || (query.isFetching && !query.isFetched && !data));

    return {
        ...query,
        data,
        isLoading,
        isNotFound: !!normalizedId && query.isFetched && !query.isLoading && !data && !query.isError,
    };
};

export const useCreateImportBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateImportBatchPayload) => createImportBatch(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_WITHOUT_LINES] });
        },
    });
};

export const useUpdateImportBatch = (batchId?: string | number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateImportBatchPayload) => updateImportBatch(batchId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_WITHOUT_LINES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL, batchId != null ? String(batchId) : undefined] });
        },
    });
};

export const useImportBatchList = () => {
    const [filters, setFilters] = useState<ImportBatchListParams>({
        page: 1,
        size: 10,
        // Default sort is applied by backend (drawDate desc, createdAt desc)
    });

    const { data, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST, filters],
        queryFn: () => getImportBatches(filters),
        placeholderData: keepPreviousData,
    });

    const batches = useMemo(() => data?.data?.recordList ?? [], [data]);
    const pagination = data?.data?.pagination ?? {
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
        setPage: (page: number) => setFilters((prev) => ({ ...prev, page })),
        setLimit: (size: number) => setFilters((prev) => ({ ...prev, size, page: 1 })),
    };
};

export const useDraftImportBatches = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST, 'DRAFT-select'],
        queryFn: () => getImportBatches({ status: 'DRAFT', size: 100, page: 1 }),
        enabled,
        select: (res) => res.data?.recordList ?? [],
        staleTime: 30_000,
    });
};

export const useIncompleteImportBatches = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE],
        queryFn: getIncompleteImportBatches,
        enabled,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useImportBatchesWithoutLines = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_WITHOUT_LINES],
        queryFn: getImportBatchesWithoutLines,
        enabled,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        retry: false,
        throwOnError: false,
    });
};

export const useDeleteImportBatchLine = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ batchId, lineId }: { batchId: number | string; lineId: number | string }) =>
            deleteImportBatchLine(batchId, lineId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_WITHOUT_LINES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
        },
    });
};

export const usePauseImportBatchLine = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ batchId, lineId }: { batchId: number | string; lineId: number | string }) =>
            pauseImportBatchLine(batchId, lineId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
        },
    });
};

export const useResumeImportBatchLine = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ batchId, lineId }: { batchId: number | string; lineId: number | string }) =>
            resumeImportBatchLine(batchId, lineId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
        },
    });
};

export const useImportBatchLineEntryTickets = (
    batchId?: string | number,
    lineId?: string | number
) => {
    const normalizedBatchId =
        batchId !== undefined && batchId !== null && String(batchId).trim() !== ''
            ? String(batchId)
            : undefined;
    const normalizedLineId =
        lineId !== undefined && lineId !== null && String(lineId).trim() !== ''
            ? String(lineId)
            : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS, normalizedBatchId, normalizedLineId],
        queryFn: () => getImportBatchLineEntryTickets(normalizedBatchId!, normalizedLineId!),
        enabled: !!normalizedBatchId && !!normalizedLineId,
        select: (res) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
    });
};

export const useImportBatchTimePolicy = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_TIME_POLICY],
        queryFn: getImportBatchTimePolicy,
        select: (res) => res.data ?? null,
        staleTime: 60_000,
    });
};

export const useEligibleImportBatchStations = (
    drawDate?: string,
    importMode?: ImportBatchImportMode,
    excludeBatchId?: string | number
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_ELIGIBLE_STATIONS, drawDate, importMode, excludeBatchId],
        queryFn: () => getEligibleImportBatchStations(drawDate!, importMode!, excludeBatchId),
        enabled: !!drawDate && !!importMode,
        select: (res) => res.data ?? { eligible: [], blocked: [] },
        staleTime: 10_000,
    });
};
