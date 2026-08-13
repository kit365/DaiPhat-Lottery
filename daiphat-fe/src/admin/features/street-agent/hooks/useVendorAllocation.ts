"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
    cancelVendorAllocation,
    confirmVendorReturnInspection,
    confirmVendorNoReturn,
    confirmVendorAllocation,
    createVendorAllocationDraft,
    getOpenVendorAllocationBatch,
    getVendorAllocationBatch,
    getVendorAllocationSettlementPreview,
    getVendorAllocationSuggestion,
    getVendorConfirmationQuote,
    listVendorAllocationBatches,
    openVendorAllocationReturnSession,
    removeVendorAllocationReturnSerial,
    replaceVendorAllocationReturns,
    reopenVendorReturnInspection,
    returnVendorAllocationSerials,
    settleVendorAllocation,
} from "../services/vendorAllocationService";
import {
    ConfirmVendorAllocationPayload,
    ConfirmVendorReturnInspectionPayload,
    ConfirmVendorNoReturnPayload,
    CreateVendorAllocationDraftPayload,
    ReturnVendorAllocationSerialsPayload,
    ReplaceVendorAllocationReturnsPayload,
    SettleVendorAllocationPayload,
    VendorAllocationBatch,
    VendorAllocationBatchListParams,
} from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";
import { QUERY_KEYS as RETURN_BATCH_QUERY_KEYS } from "../../ticket/return-batch/constants/queryKeys";

export interface VendorReturnSessionState {
    allocatedCount: number;
    handedOverCount: number;
    pendingInspectionCount: number;
    returnedCount: number;
    rejectedCount: number;
    soldCount: number;
    unresolvedCount: number;
    projectedSoldCount: number;
    canPreview: boolean;
    canSettle: boolean;
    isReadOnly: boolean;
}

const TERMINAL_VENDOR_BATCH_STATUSES = new Set(["SETTLED", "LATE_SETTLED", "CANCELLED", "EXPIRED"]);

export const deriveVendorReturnSessionState = (
    batch?: VendorAllocationBatch | null
): VendorReturnSessionState => {
    const workflow = batch?.returnWorkflow;
    const serials = batch?.serials ?? [];
    const count = (status: string) => serials.filter((serial) => serial.allocationStatus === status).length;
    const handedOverCount = count("HANDED_OVER");
    const pendingInspectionCount = count("RETURN_PENDING_INSPECTION");
    const returnedCount = count("RETURNED");
    const rejectedCount = count("RETURN_REJECTED");
    const soldCount = count("SOLD");
    const unresolvedCount = handedOverCount + pendingInspectionCount;
    const projectedSoldCount = soldCount + handedOverCount + rejectedCount;
    const isReturnOpen = batch?.status === "RETURN_OPEN";
    const isReadOnly = !batch || TERMINAL_VENDOR_BATCH_STATUSES.has(batch.status);
    const canPreview = isReturnOpen && pendingInspectionCount === 0;

    return {
        allocatedCount: batch?.allocatedQuantity ?? serials.length,
        handedOverCount: workflow?.handedOverQuantity ?? handedOverCount,
        pendingInspectionCount: workflow?.pendingInspectionQuantity ?? pendingInspectionCount,
        returnedCount: workflow?.acceptedReturnQuantity ?? returnedCount,
        rejectedCount: workflow?.rejectedReturnQuantity ?? rejectedCount,
        soldCount,
        unresolvedCount: workflow?.unreturnedQuantity ?? unresolvedCount,
        projectedSoldCount,
        canPreview: workflow?.canPreviewSettlement ?? canPreview,
        canSettle: workflow?.canSettle ?? canPreview,
        isReadOnly,
    };
};

export const useVendorReturnSessionState = (batch?: VendorAllocationBatch | null) =>
    useMemo(() => deriveVendorReturnSessionState(batch), [batch]);

const invalidateVendorAllocationQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    batchId?: number | string,
    options?: { includeSuggestion?: boolean; includeSettlementPreview?: boolean }
) => {
    if (batchId != null) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH, batchId] });
        if (options?.includeSettlementPreview !== false) {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW, batchId],
            });
        }
        queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CONFIRMATION_QUOTE, batchId],
        });
    } else {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH] });
        if (options?.includeSettlementPreview !== false) {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW] });
        }
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CONFIRMATION_QUOTE] });
    }
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_LIST] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_OPEN] });
    if (options?.includeSuggestion !== false) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
    }
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_CONFIDENCE] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_DAILY_SALES_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DAILY_SALES_REPORT_DETAIL] });
    queryClient.invalidateQueries({ queryKey: [RETURN_BATCH_QUERY_KEYS.RETURN_BATCHES] });
    queryClient.invalidateQueries({ queryKey: [RETURN_BATCH_QUERY_KEYS.RETURN_BATCH_DETAIL] });
};

export const useVendorAllocationSuggestion = (
    profileId?: number | string | null,
    businessDate?: string | null,
    requestedQuantity?: number | null,
    faceValue?: number | null,
    enabled = true
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION, profileId, businessDate, requestedQuantity, faceValue],
        queryFn: () => getVendorAllocationSuggestion(profileId!, businessDate!, requestedQuantity ?? undefined, faceValue ?? undefined),
        enabled: enabled && !!profileId && !!businessDate,
        // Keep the current suggestion visible while a new quantity/denomination is loading.
        // The page overlays a small progress state instead of collapsing/rebuilding the card.
        placeholderData: keepPreviousData,
        select: (response) => response.data,
    });
};

export const useVendorAllocationOpenBatch = (profileId?: number | string | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_OPEN, profileId],
        queryFn: () => getOpenVendorAllocationBatch(profileId!),
        enabled: !!profileId,
        select: (response) => response.data ?? null,
    });
};

export const useVendorAllocationBatches = (params: VendorAllocationBatchListParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_LIST, params],
        queryFn: () => listVendorAllocationBatches(params),
        select: (response) => response.data,
    });
};

export const useVendorAllocationBatch = (id?: number | string | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH, id],
        queryFn: () => getVendorAllocationBatch(id!),
        enabled: !!id,
        select: (response) => response.data,
        refetchInterval: (query) => {
            const raw = query.state.data as
                | VendorAllocationBatch
                | { data?: VendorAllocationBatch }
                | undefined;
            const status =
                raw && "status" in raw
                    ? raw.status
                    : raw && "data" in raw
                      ? raw.data?.status
                      : undefined;
            return status === "DRAFT" ? 5_000 : false;
        },
    });
};

export const useVendorConfirmationQuote = (
    id?: number | string | null,
    enabled = true
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CONFIRMATION_QUOTE, id],
        queryFn: () => getVendorConfirmationQuote(id!),
        enabled: enabled && !!id,
        select: (response) => response.data,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    });
};

export const useVendorSettlementPreview = (
    id?: number | string | null,
    enabled = true
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW, id],
        queryFn: () => getVendorAllocationSettlementPreview(id!),
        enabled: enabled && !!id,
        select: (response) => response.data,
    });
};

export const useCreateVendorAllocationDraft = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateVendorAllocationDraftPayload) => createVendorAllocationDraft(data),
        onSuccess: () => {
            invalidateVendorAllocationQueries(queryClient);
        },
    });
};

export const useConfirmVendorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number | string;
            data: ConfirmVendorAllocationPayload;
        }) => confirmVendorAllocation(id, data),
        onSuccess: (_response, variables) => {
            // Do not refetch suggestions: held deposit after confirm is expected while batch is open.
            invalidateVendorAllocationQueries(queryClient, variables.id, {
                includeSuggestion: false,
            });
        },
    });
};

export const useOpenVendorAllocationReturnSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => openVendorAllocationReturnSession(id),
        onSuccess: (_response, id) => {
            invalidateVendorAllocationQueries(queryClient, id);
        },
    });
};

export const useReturnVendorAllocationSerials = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number | string;
            data: ReturnVendorAllocationSerialsPayload;
        }) => returnVendorAllocationSerials(id, data),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
        },
    });
};

export const useReplaceVendorAllocationReturns = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: ReplaceVendorAllocationReturnsPayload }) =>
            replaceVendorAllocationReturns(id, data),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
        },
    });
};

export const useRemoveVendorAllocationReturnSerial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, serialId }: { id: number | string; serialId: number | string }) =>
            removeVendorAllocationReturnSerial(id, serialId),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
        },
    });
};

export const useConfirmVendorReturnInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number | string;
            data: ConfirmVendorReturnInspectionPayload;
        }) => confirmVendorReturnInspection(id, data),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
        },
    });
};

export const useConfirmVendorNoReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data?: ConfirmVendorNoReturnPayload }) =>
            confirmVendorNoReturn(id, data),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
        },
    });
};

export const useReopenVendorReturnInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => reopenVendorReturnInspection(id),
        onSuccess: (_response, id) => {
            invalidateVendorAllocationQueries(queryClient, id);
        },
    });
};

export const useSettleVendorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: SettleVendorAllocationPayload }) => settleVendorAllocation(id, data),
        onSuccess: (_response, variables) => {
            // A settled batch cannot be previewed again. Avoid invalidating an
            // active preview query during the status transition, which would
            // otherwise race the batch refetch and surface a harmless SAG_007.
            invalidateVendorAllocationQueries(queryClient, variables.id, {
                includeSettlementPreview: false,
            });
            queryClient.removeQueries({
                queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW, variables.id],
                exact: true,
            });
        },
    });
};

export const useCancelVendorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => cancelVendorAllocation(id),
        onSuccess: () => {
            invalidateVendorAllocationQueries(queryClient);
        },
    });
};
