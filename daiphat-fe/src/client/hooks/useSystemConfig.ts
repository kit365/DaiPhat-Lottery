import { useQuery } from '@tanstack/react-query';
import { getPublicSystemConfigByKey } from '../services/systemConfigService';

export const usePublicSystemConfig = (key: string) => {
    return useQuery({
        queryKey: ['public-system-config', key],
        queryFn: () => getPublicSystemConfigByKey(key),
        staleTime: 1000 * 60 * 60, // 1 hour since it rarely changes
    });
};
