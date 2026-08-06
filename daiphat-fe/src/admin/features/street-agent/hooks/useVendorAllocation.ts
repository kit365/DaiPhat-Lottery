"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    cancelVendorAllocation,
    confirmVendorAllocation,
    createVendorAllocationDraft,
    getOpenVendorAllocationBatch,
    getVendorAllocationBatch,
    getVendorAllocationSettlementPreview,
    getVendorAllocationSuggestion,
    listVendorAllocationBatches,
    openVendorAllocationReturnSession,
    returnVendorAllocationSerials,
    settleVendorAllocation,
} from "../services/vendorAllocationService";
import {
    ConfirmVendorAllocationPayload,
    CreateVendorAllocationDraftPayload,
    ReturnVendorAllocationSerialsPayload,
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
    } else {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_BATCH] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SETTLEMENT_PREVIEW] });
    }
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_LIST] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_OPEN] });
    if (options?.includeSuggestion !== false) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
    }
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL] });
};

export const useVendorAllocationSuggestion = (
    profileId?: number | string | null,
    businessDate?: string | null,
    enabled = true
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION, profileId, businessDate],
        queryFn: () => getVendorAllocationSuggestion(profileId!, businessDate!),
        enabled: enabled && !!profileId && !!businessDate,
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

export const useSettleVendorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => settleVendorAllocation(id),
        onSuccess: (_response, id) => {
            invalidateVendorAllocationQueries(queryClient, id);
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
