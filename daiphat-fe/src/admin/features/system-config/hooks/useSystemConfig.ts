import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSystemConfigs, updateSystemConfig } from '../services/systemConfigService';
import { ConfigType, UpdateSystemConfigRequest } from '../types/system-config';

export const SYSTEM_CONFIG_KEYS = {
    all: ['system-configs'] as const,
    list: (configType?: string) => [...SYSTEM_CONFIG_KEYS.all, { configType }] as const,
};

export const useSystemConfigs = (configType?: ConfigType | 'all') => {
    const typeParam = configType && configType !== 'all' ? configType : undefined;

    return useQuery({
        queryKey: SYSTEM_CONFIG_KEYS.list(typeParam),
        queryFn: () => getSystemConfigs(typeParam),
    });
};

export const useUpdateSystemConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateSystemConfigRequest }) =>
            updateSystemConfig(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.all });
        },
    });
};
