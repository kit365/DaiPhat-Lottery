"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createLuckyPatternConfig,
    getLuckyPatternConfigs,
    recomputeLuckyPatterns,
    updateLuckyPatternConfig,
} from "../services/luckyPatternService";
import { UpsertLuckyPatternConfigPayload } from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";

export const useLuckyPatternConfigs = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS],
        queryFn: getLuckyPatternConfigs,
        select: (response) => response.data || [],
    });
};

export const useCreateLuckyPatternConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpsertLuckyPatternConfigPayload) => createLuckyPatternConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS] });
        },
    });
};

export const useUpdateLuckyPatternConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: UpsertLuckyPatternConfigPayload }) =>
            updateLuckyPatternConfig(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS] });
        },
    });
};

export const useRecomputeLuckyPatterns = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => recomputeLuckyPatterns(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CANDIDATES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
        },
    });
};
