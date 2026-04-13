import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCategories,
    createCategory,
    getNestedCategories,
    getCategoryById,
    deleteCategory,
    updateCategory
} from '../../../api/ticketServiceCategory.api';

export const useTicketServiceCategories = (params?: any) => {
    return useQuery({
        queryKey: ['ticketService-categories', params],
        queryFn: () => getCategories(params),
    });
};

export const useNestedTicketServiceCategories = () => {
    return useQuery({
        queryKey: ['ticketService-categories', 'nested'],
        queryFn: getNestedCategories,
        select: (res) => res.data,
    });
};

export const useCreateTicketServiceCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketService-categories'] });
        },
    });
};

export const useUpdateTicketServiceCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateCategory(id, data),
        onSuccess: (response: any) => {
            if (response.code === 200 || response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticketService-categories'] });
                queryClient.invalidateQueries({ queryKey: ['ticketService-category'] });
            }
        },
    });
};

export const useTicketServiceCategoryDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['ticketService-category', id],
        queryFn: () => getCategoryById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useDeleteTicketServiceCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketService-categories'] });
        },
    });
};




