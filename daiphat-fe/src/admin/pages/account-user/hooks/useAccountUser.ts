import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, getUserById, createUser, updateUser, deleteUser, changeUserPassword } from "../../../api/account-user.api";

export const useUsers = (params?: any) => {
    return useQuery({
        queryKey: ["accounts-user", params],
        queryFn: () => getUsers(params),
    });
};

export const useUserDetail = (id?: string) => {
    return useQuery({
        queryKey: ["account-user", id],
        queryFn: () => getUserById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-user"] });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-user"] });
            queryClient.invalidateQueries({ queryKey: ["account-user"] });
        },
    });
};

export const useChangeUserPassword = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => changeUserPassword(id, data),
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-user"] });
        },
    });
};




