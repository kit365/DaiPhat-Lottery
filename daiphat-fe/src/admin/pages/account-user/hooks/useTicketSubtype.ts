import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTicketSubtypes, createTicketSubtype, updateTicketSubtype, deleteTicketSubtype } from "../../../api/ticketSubtype.api";

export const useTicketSubtypes = (params?: any) => {
    return useQuery({
        queryKey: ["ticketSubtypes", params],
        queryFn: () => getTicketSubtypes(params),
    });
};

export const useCreateTicketSubtype = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTicketSubtype,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticketSubtypes"] });
        },
    });
};

export const useUpdateTicketSubtype = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateTicketSubtype(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticketSubtypes"] });
        },
    });
};

export const useDeleteTicketSubtype = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTicketSubtype,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticketSubtypes"] });
        },
    });
};




