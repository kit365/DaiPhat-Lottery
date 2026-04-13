import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTicketAttributes,
    getTicketAttributeDetail,
    deleteTicketAttribute,
    updateTicketAttribute,
    createTicketAttribute,
    restoreTicketAttribute,
    forceDeleteTicketAttribute
} from '../../../api/ticket-attribute.api';


export const useTicketAttributes = (params?: any) => {
    return useQuery({
        queryKey: ['ticket-attributes', params],
        queryFn: () => getTicketAttributes(params),
    });
};

export const useTicketAttributeDetail = (id: string | undefined) => {
    return useQuery({
        queryKey: ['ticket-attribute-detail', id],
        queryFn: () => getTicketAttributeDetail(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateTicketAttribute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTicketAttribute,
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-attributes'] });
            }
        },
    });
};

export const useUpdateTicketAttribute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: any }) => updateTicketAttribute(id, data),
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-attributes'] });
                queryClient.invalidateQueries({ queryKey: ['ticket-attribute-detail'] });
            }
        },
    });
};

export const useDeleteTicketAttribute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTicketAttribute,
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-attributes'] });
            }
        },
    });
};

export const useRestoreTicketAttribute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreTicketAttribute,
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-attributes'] });
            }
        },
    });
};

export const useForceDeleteTicketAttribute = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: forceDeleteTicketAttribute,
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-attributes'] });
            }
        },
    });
};
