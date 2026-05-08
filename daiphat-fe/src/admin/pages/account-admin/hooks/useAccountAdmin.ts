import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, changeAccountPassword, getStaffByTicketService } from "../../../api/account-admin.api";
import { getRoles } from "../../../api/role.api";
import { QUERY_KEYS } from "../../../constants/queryKeys";
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
        mutationFn: (data: any) => createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
        },
    });
};

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateAccount(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNT_ADMIN_DETAIL] });
        },
    });
};

export const useChangeAccountPassword = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => changeAccountPassword(id, data),
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
