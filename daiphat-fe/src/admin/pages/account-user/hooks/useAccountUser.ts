import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { getUsers, getUserById, createUser, updateUser, deleteUser, changeUserPassword, getStatuses, initiateResetPassword, confirmResetPassword, inviteStaff, searchCustomers } from "../../../api/account-user.api";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { ApiResponse, PageResponse, BaseQueryParams } from "../../../config/type";
import { User } from "../../../../types/user.type";

export const useUserStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.USER_STATUSES],
        queryFn: getStatuses,
        staleTime: 5 * 60 * 1000,
    });
};

export const useUsers = (params?: (BaseQueryParams & { customerSearch?: boolean }), options?: Partial<UseQueryOptions<any>>) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNTS_USER, params?.customerSearch ? 'customer-search' : 'list', params],
        queryFn: () => params?.customerSearch
            ? searchCustomers({ q: params.q || '', limit: params.limit || 10 })
            : getUsers(params),
        ...options
    });
};

export const useUserDetail = (id?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNT_USER_DETAIL, id],
        queryFn: () => getUserById(id!),
        enabled: !!id,
        select: (res: ApiResponse<User>) => res.data,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_USER] });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_USER] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_USER_DETAIL] });
        },
    });
};

export const useChangeUserPassword = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => changeUserPassword(id, data),
    });
};

export const useInitiateResetPassword = () => {
    return useMutation({
        mutationFn: (id: string) => initiateResetPassword(id),
    });
};

export const useConfirmResetPassword = () => {
    return useMutation({
        mutationFn: ({ id, otp }: { id: string; otp: string }) => confirmResetPassword(id, otp),
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_USER] });
        },
    });
};

export const useInviteStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) => inviteStaff(id, { roleCode }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_USER] });
        },
    });
};

