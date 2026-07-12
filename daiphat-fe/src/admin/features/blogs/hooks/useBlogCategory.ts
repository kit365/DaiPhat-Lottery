import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogCategoryQueryParams, UpdateBlogCategoryRequest, BlogCategoryResponse, BlogCategoryMutationPayload } from '../types/blog-category.type';
import { getCategories, createCategory, getNestedCategories, getCategoryById, deleteCategory, updateCategory, getCategoryStatuses } from '../services/blogCategoryService';
import { QUERY_KEYS } from "../constants/queryKeys";
import { QUERY_KEYS as SHARED_QUERY_KEYS } from "../../../../constants/queryKeys";

export const useBlogCategoryStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORIES, 'statuses'],
        queryFn: getCategoryStatuses,
        staleTime: 5 * 60 * 1000,
    });
};

export const useBlogCategories = (params?: BlogCategoryQueryParams) => {
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
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
        },
    });
};

export const useUpdateBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: BlogCategoryMutationPayload }) => updateCategory(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORY_DETAIL] });
                queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
                queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
            }
        },
    });
};

export const useBlogCategoryDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_CATEGORY_DETAIL, id],
        queryFn: () => getCategoryById(id!),
        enabled: !!id,
        select: (res: ApiResponse<BlogCategoryResponse>) => res.data,
    });
};

export const useDeleteBlogCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_CATEGORIES] });
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
        },
    });
};
