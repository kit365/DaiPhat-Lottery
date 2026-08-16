"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getLuckyPatternConfigs, LUCKY_PATTERN_QUERY_KEY } from "@/shared/lucky-number";
import { QUERY_STALE_TIMES } from "@/shared/react-query";

/** Warm lucky-pattern cache once per session (same API as admin). */
export const LuckyPatternPrefetcher = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        void queryClient.prefetchQuery({
            queryKey: LUCKY_PATTERN_QUERY_KEY,
            queryFn: getLuckyPatternConfigs,
            staleTime: QUERY_STALE_TIMES.static,
        });
    }, [queryClient]);

    return null;
};
