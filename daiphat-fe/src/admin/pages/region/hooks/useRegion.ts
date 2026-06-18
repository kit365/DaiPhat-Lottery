import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRegions, getRegionByCode, updateRegion } from "../../../api/region.api";
import { UpdateLotteryRegionRequest } from "../types/region";

export const REGION_KEYS = {
    all: ['regions'] as const,
    detail: (code: string) => [...REGION_KEYS.all, code] as const,
};

export const useRegions = () => {
    return useQuery({
        queryKey: REGION_KEYS.all,
        queryFn: () => getRegions(),
    });
};

export const useRegionDetail = (code?: string) => {
    return useQuery({
        queryKey: REGION_KEYS.detail(code!),
        queryFn: () => getRegionByCode(code!),
        enabled: !!code,
    });
};

export const useUpdateRegion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ code, data }: { code: string; data: UpdateLotteryRegionRequest }) => 
            updateRegion(code, data),
        onSuccess: (res, variables) => {
            queryClient.invalidateQueries({ queryKey: REGION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: REGION_KEYS.detail(variables.code) });
        },
    });
};
