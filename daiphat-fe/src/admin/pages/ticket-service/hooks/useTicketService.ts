import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTicketServices,
    createTicketService,
    getTicketServiceById,
    deleteTicketService,
    updateTicketService
} from '../../../api/ticketService.api';

export const useTicketServices = (params?: any) => {
    return useQuery({
        queryKey: ['ticketServices', params],
        queryFn: () => getTicketServices(params),
    });
};

export const useCreateTicketService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTicketService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketServices'] });
        },
    });
};

export const useUpdateTicketService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateTicketService(id, data),
        onSuccess: (response: any) => {
            if (response.code === 200 || response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticketServices'] });
                queryClient.invalidateQueries({ queryKey: ['ticketService'] });
            }
        },
    });
};

export const useTicketServiceDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['ticketService', id],
        queryFn: () => getTicketServiceById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useDeleteTicketService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTicketService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketServices'] });
        },
    });
};




