import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory } from '../../../api/ticket-category.api';

export const useCategories = () => {
    // Hook lấy danh sách danh mục
    return useQuery({
        queryKey: ['ticket-categories'],
        queryFn: getCategories,
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
        },
    });
};



