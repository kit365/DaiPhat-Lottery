import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, changeAccountPassword, getStaffByTicketService } from "../../../api/account-admin.api";

export const useAccounts = (params?: any) => {
    return useQuery({
        queryKey: ["accounts-admin", params],
        queryFn: () => getAccounts(params),
        // select: (res: any) => res.data?.recordList || [],
    });
};

export const useStaffByTicketService = (ticketServiceId?: string) => {
    return useQuery({
        queryKey: ["staff-by-ticketService", ticketServiceId],
        queryFn: () => getStaffByTicketService(ticketServiceId!),
        enabled: !!ticketServiceId,
        select: (res: any) => {
            if (!res) return [];
            const data = res as any;
            if (Array.isArray(data.data?.recordList)) return data.data.recordList;
            if (Array.isArray(data.recordList)) return data.recordList;
            if (Array.isArray(data.data)) return data.data;
            if (Array.isArray(data)) return data;
            return [];
        },
    });
};

export const useAccountDetail = (id?: string) => {
    return useQuery({
        queryKey: ["account-admin", id],
        queryFn: () => getAccountById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
        retry: false, // Don't spam 403 on profile if forbidden
    });
};

export const useCreateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-admin"] });
        },
    });
};

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateAccount(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-admin"] });
            queryClient.invalidateQueries({ queryKey: ["account-admin"] });
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
            queryClient.invalidateQueries({ queryKey: ["accounts-admin"] });
        },
    });
};




