import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
    createImportBatch,
    getActiveImportBatchDraft,
    getImportBatchById,
    getImportBatches,
    getEligibleImportBatchStations,
    getImportBatchTimePolicy,
    CreateImportBatchPayload,
    ImportBatchListParams,
} from '../../../api/importBatch.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
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
    });

    const data =
        query.data && normalizedId && String(query.data.id) === normalizedId
            ? query.data
            : undefined;

    return {
        ...query,
        data,
        isLoading: query.isLoading || (!!normalizedId && !data && query.isFetching),
    };
};

export const useCreateImportBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateImportBatchPayload) => createImportBatch(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST] });
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
    importMode?: ImportBatchImportMode
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_ELIGIBLE_STATIONS, drawDate, importMode],
        queryFn: () => getEligibleImportBatchStations(drawDate!, importMode!),
        enabled: !!drawDate && !!importMode,
        select: (res) => res.data ?? { eligible: [], blocked: [] },
        staleTime: 10_000,
    });
};
