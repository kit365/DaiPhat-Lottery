import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserTickets, getUserTicketById, createUserTicket, updateUserTicket, deleteUserTicket } from "../../../api/userTicket.api";

export const useUserTickets = (params?: any) => {
    return useQuery({
        queryKey: ["userTickets", params],
        queryFn: () => getUserTickets(params),
    });
};

export const useUserTicketDetail = (id?: string) => {
    return useQuery({
        queryKey: ["userTicket", id],
        queryFn: () => getUserTicketById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateUserTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createUserTicket(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userTickets"] });
            queryClient.invalidateQueries({ queryKey: ["accounts-user"] });
        },
    });
};

export const useUpdateUserTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUserTicket(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userTickets"] });
            queryClient.invalidateQueries({ queryKey: ["userTicket"] });
        },
    });
};

export const useDeleteUserTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteUserTicket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userTickets"] });
        },
    });
};




