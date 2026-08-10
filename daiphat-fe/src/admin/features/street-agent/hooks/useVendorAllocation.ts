"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    cancelVendorAllocation,
    confirmVendorReturnInspection,
    confirmVendorAllocation,
    createVendorAllocationDraft,
    getOpenVendorAllocationBatch,
    getVendorAllocationBatch,
    getVendorAllocationSettlementPreview,
    getVendorAllocationSuggestion,
    getVendorConfirmationQuote,
    listVendorAllocationBatches,
    openVendorAllocationReturnSession,
    returnVendorAllocationSerials,
    settleVendorAllocation,
} from "../services/vendorAllocationService";
import {
    ConfirmVendorAllocationPayload,
    ConfirmVendorReturnInspectionPayload,
    CreateVendorAllocationDraftPayload,
    ReturnVendorAllocationSerialsPayload,
    SettleVendorAllocationPayload,
    VendorAllocationBatch,
    VendorAllocationBatchListParams,
} from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";

const invalidateVendorAllocationQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    batchId?: number | string,
    options?: { includeSuggestion?: boolean }
) => {
    if (batchId != null) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH, batchId] });
        queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW, batchId],
        });
        queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CONFIRMATION_QUOTE, batchId],
        });
    } else {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW] });
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

export const useSettleVendorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: SettleVendorAllocationPayload }) => settleVendorAllocation(id, data),
        onSuccess: (_response, variables) => {
            invalidateVendorAllocationQueries(queryClient, variables.id);
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
