import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, getNestedCategories, getCategoryById, deleteCategory, updateCategory, restoreCategory, forceDeleteCategory, getCategoryStatuses } from '../../../api/blog-category.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

export const useBlogCategoryStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORIES, 'statuses'],
        queryFn: getCategoryStatuses,
        staleTime: 5 * 60 * 1000,
    });
};

export const useBlogCategories = (params?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORIES, params],
        queryFn: () => getCategories(params),
    });
};

export const useNestedBlogCategories = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORIES, 'nested'],
        queryFn: getNestedCategories,
        select: (res) => res.data,
    });
};

export const useCreateBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
        },
    });
};

export const useUpdateBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateCategory(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORY_DETAIL] });
            }
        },
    });
};

export const useBlogCategoryDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORY_DETAIL, id],
        queryFn: () => getCategoryById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useDeleteBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
        },
    });
};

export const useRestoreBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
        },
    });
};

export const useForceDeleteBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: forceDeleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
        },
    });
};




