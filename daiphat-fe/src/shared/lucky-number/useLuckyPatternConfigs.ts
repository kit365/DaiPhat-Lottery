"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_STALE_TIMES } from "@/shared/react-query";
import { getLuckyPatternConfigs, LUCKY_PATTERN_QUERY_KEY } from "./luckyPatternService";
import type { LuckyPatternConfig } from "./types";

export const useLuckyPatternConfigs = () => {
    return useQuery({
        queryKey: LUCKY_PATTERN_QUERY_KEY,
        queryFn: getLuckyPatternConfigs,
        select: (patterns): LuckyPatternConfig[] =>
            (patterns || []).filter((pattern) => pattern.active !== false),
        staleTime: QUERY_STALE_TIMES.static,
    });
};
