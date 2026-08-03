"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getRoles,
    getRoleById,
    createRole,
    updateRolePermissions,
    deleteRole,
    getPermissions,
    reorderPermissions,
} from "../services/roleService";
import { QUERY_KEYS } from "../constants/queryKeys";
import { QUERY_KEYS as APP_QUERY_KEYS } from "../../../../constants/queryKeys";
import { CreateRoleRequest } from "../types/role.type";

export const usePermissions = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.PERMISSIONS_ALL],
        queryFn: () => getPermissions(),
        select: (res) => res.data || [],
    });
};

export const useRoles = (params?: Record<string, unknown>) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ROLES, params],
        queryFn: () => getRoles(params),
        select: (res) => {
            if (res.data && 'recordList' in res.data) {
                return res.data.recordList;
            }
            return Array.isArray(res.data) ? res.data : [];
        },
    });
};

export const useRoleDetail = (id?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ROLE_DETAIL, id],
        queryFn: () => getRoleById(id!),
        enabled: !!id,
        select: (res) => res.data,
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateRoleRequest) => createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            permissions,
            data,
        }: {
            id: string;
            permissions?: string[];
            data?: { permissions?: string[] };
        }) => updateRolePermissions(id, permissions ?? data?.permissions ?? []),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLE_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [APP_QUERY_KEYS.AUTH_ME] });
        },
    });
};

export const useReorderPermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (positionMap: Record<string, number>) => reorderPermissions(positionMap),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERMISSIONS_ALL] });
        },
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
        },
    });
};
