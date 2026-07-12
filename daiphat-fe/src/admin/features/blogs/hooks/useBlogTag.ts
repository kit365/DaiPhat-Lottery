import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { BlogTagQueryParams, BlogTagResponse } from '../types/blog-tag.type';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBlogTags, getBlogTags, createBlogTag, deleteBlogTag, updateBlogTag } from '../services/blogTagService';
import { QUERY_KEYS } from "../constants/queryKeys";

export const useBlogTags = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS],
        queryFn: getAllBlogTags,
        select: (res: ApiResponse<BlogTagResponse[]>) => res.data || []
    });
};

export const useBlogTagsPaged = (params?: BlogTagQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED, params],
        queryFn: () => getBlogTags(params),
        select: (res: ApiResponse<PageResponse<BlogTagResponse>>) => {
            const data = res.data;
            let records: BlogTagResponse[] = [];
            let pagination: any = { totalRecords: 0 };

            if (data && typeof data === 'object' && 'recordList' in data) {
                records = data.recordList || [];
                pagination = {
                    totalRecords: data.pagination?.totalRecords || 0,
                    totalPages: data.pagination?.totalPages || 0,
                    currentPage: data.pagination?.currentPage || 1,
                    limit: data.pagination?.limit || 10
                };
            }

            return {
                recordList: records,
                pagination
            };
        }
    });
};

export const useCreateBlogTag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBlogTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED] });
        },
    });
};

export const useDeleteBlogTag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteBlogTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED] });
        },
    });
};

export const useUpdateBlogTag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: { name: string; slug?: string } }) => updateBlogTag(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED] });
        },
    });
};
