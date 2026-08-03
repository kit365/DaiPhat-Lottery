"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createStreetAgentProfile,
    getStreetAgentProfileById,
    getStreetAgentProfiles,
    updateStreetAgentProfile,
} from "../services/streetAgentService";
import { StreetAgentQueryParams } from "../types/street-agent.type";
import { QUERY_KEYS } from "../constants/queryKeys";

export const useStreetAgentProfiles = (params?: StreetAgentQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES, params],
        queryFn: () => getStreetAgentProfiles(params),
        placeholderData: keepPreviousData,
    });
};

export const useStreetAgentProfileDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, id],
        queryFn: () => getStreetAgentProfileById(id!),
        enabled: !!id,
        select: (response) => response.data,
    });
};

export const useCreateStreetAgentProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => createStreetAgentProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
        },
    });
};

export const useUpdateStreetAgentProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) =>
            updateStreetAgentProfile(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES] });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, variables.id],
            });
        },
    });
};
