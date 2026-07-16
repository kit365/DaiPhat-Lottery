import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRegions, getRegionByCode, updateRegion } from "../services/regionService";
import { UpdateLotteryRegionRequest } from "../types/region.type";
import { QUERY_KEYS } from "../constants/queryKeys";

export const useRegions = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.REGIONS],
        queryFn: () => getRegions(),
    });
};

export const useRegionDetail = (code?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.REGION_DETAIL, code],
        queryFn: () => getRegionByCode(code!),
        enabled: !!code,
    });
};

export const useUpdateRegion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ code, data }: { code: string; data: UpdateLotteryRegionRequest }) =>
            updateRegion(code, data),
        onSuccess: (_res, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.REGIONS] });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.REGION_DETAIL, variables.code],
            });
        },
    });
};
