import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoles, getRoleById, createRole, updateRole, deleteRole } from "../../../api/role.api";

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
        mutationFn: ({ id, data }: { id: string; data: any }) => updateRole(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["role"] });
        },
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




