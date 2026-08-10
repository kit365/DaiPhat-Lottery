"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createStreetAgentProfile,
    getDailySalesReportById,
    getStreetAgentConfidence,
    getStreetAgentProfileById,
    getStreetAgentProfiles,
    listStreetAgentDailySalesReports,
    updateStreetAgentProfile,
    updateApprovedDailyCap,
    uploadStreetAgentSignedContract,
} from "../services/streetAgentService";
import {
    DailySalesReportListParams,
    CreateStreetAgentProfilePayload,
    StreetAgentQueryParams,
    UpdateApprovedDailyCapPayload,
} from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";

export const useStreetAgentProfiles = (params?: StreetAgentQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES, params],
        queryFn: () => getStreetAgentProfiles(params),
        placeholderData: keepPreviousData,
    });
};

const STREET_AGENT_STATUS_FILTERS = ["all", "ACTIVE", "INACTIVE", "PENDING"] as const;

/**
 * The list endpoint is paginated, so the selected tab response cannot provide
 * counts for the other tabs. Fetch a one-row page for each status and use its
 * server-side totalRecords value for the badges.
 */
export const useStreetAgentProfileStatusCounts = () => {
    const queries = useQueries({
        queries: STREET_AGENT_STATUS_FILTERS.map((status) => ({
            queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES, "status-count", status],
            queryFn: () =>
                getStreetAgentProfiles({
                    page: 1,
                    limit: 1,
                    status: status === "all" ? undefined : status,
                }),
            staleTime: 30_000,
        })),
    });

    return {
        counts: Object.fromEntries(
            STREET_AGENT_STATUS_FILTERS.map((status, index) => [
                status,
                queries[index]?.data?.data?.pagination?.totalRecords ?? 0,
            ])
        ) as Record<(typeof STREET_AGENT_STATUS_FILTERS)[number], number>,
        isLoading: queries.some((query) => query.isLoading),
    };
};

export const useStreetAgentProfileDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, id],
        queryFn: () => getStreetAgentProfileById(id!),
        enabled: !!id,
        select: (response) => response.data,
    });
};

export const useStreetAgentConfidence = (id?: string | number | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_CONFIDENCE, id],
        queryFn: () => getStreetAgentConfidence(id!),
        enabled: !!id,
        select: (response) => response.data,
    });
};

export const useStreetAgentDailySalesReports = (
    id?: string | number | null,
    params?: DailySalesReportListParams
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_DAILY_SALES_REPORTS, id, params],
        queryFn: () => listStreetAgentDailySalesReports(id!, params),
        enabled: !!id,
        select: (response) => response.data,
    });
};

export const useDailySalesReportDetail = (id?: string | number | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.DAILY_SALES_REPORT_DETAIL, id],
        queryFn: () => getDailySalesReportById(id!),
        enabled: !!id,
        select: (response) => response.data,
    });
};

export const useCreateStreetAgentProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStreetAgentProfilePayload) => createStreetAgentProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
        },
    });
};

export const useUpdateStreetAgentProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) =>
            updateStreetAgentProfile(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, variables.id],
            });
        },
    });
};

export const useUpdateApprovedDailyCap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: UpdateApprovedDailyCapPayload }) =>
            updateApprovedDailyCap(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, variables.id],
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_CONFIDENCE, variables.id] });
        },
    });
};

export const useUploadStreetAgentSignedContract = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: string | number; file: File }) =>
            uploadStreetAgentSignedContract(id, file),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, variables.id],
            });
        },
    });
};
