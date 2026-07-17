import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword,
    getStatuses,
    initiateUserPasswordReset,
    confirmUserPasswordReset,
    searchCustomers,
    uploadUserAvatar,
    deleteUserAvatar,
    getStaffByTicketService
} from "../services/userService";
import { getRoles } from "../../role/services/roleService";
import { QUERY_KEYS } from "../constants/queryKeys";
import { ApiResponse, PageResponse } from "../../../../types/api.type";
import { User } from "../../../../types/user.type";
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from "../types/user.types";

export const useUsers = (params?: UserQueryParams, options?: Partial<UseQueryOptions<ApiResponse<PageResponse<User>>>>) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN, params],
        queryFn: () => getUsers(params),
        ...options
    });
};

export const useUserStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.USER_STATUSES],
        queryFn: getStatuses,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
};

export const useSearchCustomers = (params: { q: string; limit?: number }, options?: Partial<UseQueryOptions<ApiResponse<User[]>>>) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SEARCH_CUSTOMERS, params.q, params.limit],
        queryFn: () => searchCustomers(params),
        enabled: !!params.q && params.q.trim().length > 0,
        staleTime: 1000 * 60,
        ...options
    });
};

export const useRoles = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.ROLES],
        queryFn: getRoles,
    });
};

export const useStaffByTicketService = (ticketServiceId?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STAFF_BY_TICKET_SERVICE, ticketServiceId],
        queryFn: () => getStaffByTicketService(ticketServiceId!),
        enabled: !!ticketServiceId,
        select: (res: ApiResponse<User[]>) => {
            return res.data || [];
        },
    });
};

export const useUserDetail = (id?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, id],
        queryFn: () => getUserById(id!),
        enabled: !!id,
        select: (res: ApiResponse<User>) => res.data,
        retry: false,
    });
};

// Compatibility names for modules moved from pages/account-admin during the feature refactor.
export const useAccounts = useUsers;
export const useAccountDetail = useUserDetail;

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateUserRequest) => createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] }); // legacy compat if needed
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL] });
        },
    });
};

export const useChangeUserPassword = () => {
    return useMutation({
        mutationFn: ({ id }: { id: string; data?: unknown }) => changeUserPassword(id),
    });
};

export const useInitiateUserPasswordReset = () => {
    return useMutation({
        mutationFn: (id: string) => initiateUserPasswordReset(id),
    });
};

export const useConfirmUserPasswordReset = () => {
    return useMutation({
        mutationFn: ({ id, otp }: { id: string; otp: string }) => confirmUserPasswordReset(id, otp),
    });
};

export const useUploadUserAvatar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => uploadUserAvatar(id, file),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, variables.id] });
        },
    });
};

export const useDeleteUserAvatar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteUserAvatar(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, id] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
        },
    });
};
