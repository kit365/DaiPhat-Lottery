"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    bulkUpdateVendorConfidencePolicy,
    getSystemConfigs,
    updateSystemConfig,
} from '../services/systemConfigService';
import { ConfigType, UpdateSystemConfigRequest } from '../types/system-config';
import { QUERY_KEYS as STREET_AGENT_QUERY_KEYS } from '../../street-agent/constants/queryKeys';

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
            // Policy changes affect already-open suggestion/quote screens. Keep their
            // source-of-truth on the BE by forcing a fresh read after a save.
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_CANDIDATES] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_OPEN] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_CONFIRMATION_QUOTE] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL] });
        },
    });
};

export const useBulkUpdateVendorConfidencePolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (values: Record<string, string>) => bulkUpdateVendorConfidencePolicy(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.all });
            // Confidence tiers change the effective vendor cap immediately. Any
            // open allocation screen must re-read the BE suggestion instead of
            // keeping a stale cap in React Query.
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_SUGGESTION] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.VENDOR_ALLOCATION_CANDIDATES] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({ queryKey: [STREET_AGENT_QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL] });
        },
    });
};
