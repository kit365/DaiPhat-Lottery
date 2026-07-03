import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createImportBatch,
    getActiveImportBatchDraft,
    getImportBatchById,
    getEligibleImportBatchStations,
    CreateImportBatchPayload,
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
    return useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_DETAIL, id],
        queryFn: () => getImportBatchById(id!),
        enabled: !!id,
        select: (res) => res.data ?? null,
    });
};

export const useCreateImportBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateImportBatchPayload) => createImportBatch(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
        },
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
        select: (res) => res.data ?? [],
        staleTime: 10_000,
    });
};
