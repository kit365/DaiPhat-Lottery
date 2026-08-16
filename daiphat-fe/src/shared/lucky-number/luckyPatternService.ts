import { apiApp } from "@/api";
import { ApiResponse } from "@/types/api.type";
import type { LuckyPatternConfig } from "./types";

/** Same endpoint as admin Cấu hình số đẹp — silent on 401/403 (e.g. client guest). */
const LUCKY_PATTERN_REQUEST = { skipGlobalErrorToast: true } as const;

export const LUCKY_PATTERN_QUERY_KEY = ["lucky-pattern-configs"] as const;

export const getLuckyPatternConfigs = async (): Promise<LuckyPatternConfig[]> => {
    try {
        const response = await apiApp.get<ApiResponse<LuckyPatternConfig[]>>(
            "/lucky-pattern-configs",
            LUCKY_PATTERN_REQUEST
        );
        return response.data?.data || [];
    } catch {
        return [];
    }
};
