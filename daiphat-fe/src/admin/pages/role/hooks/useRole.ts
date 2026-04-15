import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoles, getRoleById, createRole, updateRolePermissions, deleteRole, getPermissions, reorderPermissions } from "../../../api/role.api";

export const usePermissions = () => {
    return useQuery({
        queryKey: ["permissions_all"],
        queryFn: () => getPermissions(),
        select: (res: any) => res.data || [],
    });
};

export const useRoles = (params?: any) => {
    return useQuery({
        queryKey: ["roles", params],
        queryFn: () => getRoles(params),
        select: (res: any) => res.data?.recordList || (Array.isArray(res.data) ? res.data : []),
    });
};

export const useRoleDetail = (id?: string) => {
    return useQuery({
        queryKey: ["role", id],
        queryFn: () => getRoleById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => updateRolePermissions(id, permissions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["role"] });
        },
    });
};

export const useReorderPermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (positionMap: Record<string, number>) => reorderPermissions(positionMap),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["permissions_all"] });
        }
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
        },
    });
};




