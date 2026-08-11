"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchImportScannedTickets, scanTicketImage } from '../services/ticketScanService';
import { QUERY_KEYS as GLOBAL_QUERY_KEYS } from '../../../../../constants/queryKeys';
import { QUERY_KEYS } from '../constants/queryKeys';
import { BatchImportScannedTicketsPayload } from '../types/ticketScan.type';

export const useScanTicketImage = () => {
    return useMutation({
        mutationFn: ({
            importBatchLineId,
            file,
            skipGlobalErrorToast,
        }: {
            importBatchLineId: number | string;
            file: File;
            skipGlobalErrorToast?: boolean;
        }) => scanTicketImage(importBatchLineId, file, { skipGlobalErrorToast }),
    });
};

export const useBatchImportScannedTickets = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: {
            data: BatchImportScannedTicketsPayload;
            skipGlobalErrorToast?: boolean;
        }) => batchImportScannedTickets(variables.data, { skipGlobalErrorToast: variables.skipGlobalErrorToast }),
        onSuccess: () => {
            // Same invalidations as manual bulk-import — a scan batch-import
            // persists through the same LotteryTicketServicePort#create path.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_LIST] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] });
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] });
            queryClient.invalidateQueries({
                queryKey: [GLOBAL_QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS],
            });
        },
    });
};
