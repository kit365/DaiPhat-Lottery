import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import {
    getAccounts,
    getAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    changeAccountPassword,
    getStaffByTicketService,
    initiateAccountPasswordReset,
    confirmAccountPasswordReset,
    uploadAccountAvatar,
    deleteAccountAvatar
} from "../../../api/account-admin.api";
import { getRoles } from "../../../services/role.service";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { ApiResponse, PageResponse, BaseQueryParams } from "../../../config/type";
import { User } from "../../../../types/user.type";

export const useAccounts = (params?: BaseQueryParams, options?: Partial<UseQueryOptions<ApiResponse<PageResponse<User>>>>) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN, params],
        queryFn: () => getAccounts(params),
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

export const useAccountDetail = (id?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, id],
        queryFn: () => getAccountById(id!),
        enabled: !!id,
        select: (res: ApiResponse<User>) => res.data,
        retry: false,
    });
};

export const useCreateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<User>) => createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
        },
    });
};

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateAccount(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL] });
        },
    });
};

export const useChangeAccountPassword = () => {
    return useMutation({
        mutationFn: ({ id }: { id: string; data?: unknown }) => changeAccountPassword(id),
    });
};

export const useInitiateAccountPasswordReset = () => {
    return useMutation({
        mutationFn: (id: string) => initiateAccountPasswordReset(id),
    });
};

export const useConfirmAccountPasswordReset = () => {
    return useMutation({
        mutationFn: ({ id, otp }: { id: string; otp: string }) => confirmAccountPasswordReset(id, otp),
    });
};

export const useUploadAccountAvatar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => uploadAccountAvatar(id, file),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, variables.id] });
        },
    });
};

export const useDeleteAccountAvatar = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteAccountAvatar(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL, id] });
        },
    });
};

export const useDeleteAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
        },
    });
};
