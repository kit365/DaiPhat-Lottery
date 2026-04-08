import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTicketServiceOrders, createTicketServiceOrder } from '../../../api/ticketServiceOrder.api';

export const useTicketServiceOrders = (params?: any) => {
    return useQuery({
        queryKey: ['ticketServiceOrders', params],
        queryFn: () => getTicketServiceOrders(params),
        select: (res: any) => res.data || [],
    });
};

export const useCreateTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createTicketServiceOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketServiceOrders'] });
        },
    });
};




