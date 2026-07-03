import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBlogTags, getBlogTags, createBlogTag, deleteBlogTag, updateBlogTag } from '../services/blogTag.service';
import { QUERY_KEYS } from '../../constants/queryKeys';

export const useBlogTags = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS],
        queryFn: getAllBlogTags,
        select: (res: any) => res.data || []
    });
};

export const useBlogTagsPaged = (params?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED, params],
        queryFn: () => getBlogTags(params),
        select: (res: any) => {
            const data = res.data;
            let records: any[] = [];
            let pagination = { totalRecords: 0 };

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
