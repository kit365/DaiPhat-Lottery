"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    createLuckyPatternConfig,
    recomputeLuckyPatterns,
    updateLuckyPatternConfig,
} from "../services/luckyPatternService";
import { UpsertLuckyPatternConfigPayload } from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";
import { LUCKY_PATTERN_QUERY_KEY, useLuckyPatternConfigs } from "@/shared/lucky-number";

export { useLuckyPatternConfigs };

export const useCreateLuckyPatternConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpsertLuckyPatternConfigPayload) => createLuckyPatternConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS] });
            queryClient.invalidateQueries({ queryKey: LUCKY_PATTERN_QUERY_KEY });
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
            queryClient.invalidateQueries({ queryKey: LUCKY_PATTERN_QUERY_KEY });
        },
    });
};

export const useRecomputeLuckyPatterns = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => recomputeLuckyPatterns(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LUCKY_PATTERN_CONFIGS] });
            queryClient.invalidateQueries({ queryKey: LUCKY_PATTERN_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_CANDIDATES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['public-buy-ticket'] });
        },
    });
};
