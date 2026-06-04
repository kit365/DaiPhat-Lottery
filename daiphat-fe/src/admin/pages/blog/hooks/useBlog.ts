import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlogs, createBlog, getBlogById, updateBlog, deleteBlog, getBlogTags, getAllBlogTags, createBlogTag, deleteBlogTag, updateBlogTag, getBlogTypes, getBlogStatuses } from '../../../api/blog.api';
import { ApiResponse } from '../../../config/type';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

export const useBlogs = (params?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOGS, params],
        queryFn: () => getBlogs(params),
        select: (res: ApiResponse<any>) => {
            const data = res.data;
            let records: any[] = [];
            let pagination = { totalRecords: 0, totalPages: 0, currentPage: 1, limit: 10, isFirst: true, isLast: true };

            if (data && typeof data === 'object' && 'recordList' in data) {
                records = data.recordList || [];
                pagination = {
                    totalRecords: data.pagination?.totalRecords || 0,
                    totalPages:   data.pagination?.totalPages   || 0,
                    currentPage:  data.pagination?.currentPage  || 1,
                    limit:        data.pagination?.limit        || 10,
                    isFirst:      data.pagination?.isFirst      ?? true,
                    isLast:       data.pagination?.isLast       ?? true,
                };
            } else if (Array.isArray(data)) {
                records = data;
            }

            return {
                recordList: records.map((item: any) => ({
                    ...item,
                    // BE trả về đúng field – map thêm alias cho BlogList.tsx dùng
                    id:            item.id,
                    title:         item.title,
                    featuredImage: item.thumbnail || null,
                    viewCount:     item.viewCount  ?? 0,
                    status:        (item.status || 'draft').toLowerCase(),
                    createdAt:     item.createdAt,
                    updatedAt:     item.updatedAt,
                    category:      item.category   || null,
                    tags:          item.tags        || [],
                    slug:          item.slug        || '',
                })),
                pagination,
                // BE không trả về statusCounts – để 0 để tránh crash UI
                statusCounts: { all: 0, published: 0, draft: 0, archived: 0 },
            };
        },
    });
};


export const useCreateBlog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBlog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOGS] });
        },
    });
};

export const useUpdateBlog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateBlog(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOGS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_DETAIL] });
            }
        },
    });
};

export const useBlogDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_DETAIL, id],
        queryFn: () => getBlogById(id!),
        enabled: !!id,
        select: (res: any) => {
            const data = res.data || res;
            if (data) {
                return {
                    ...data,
                    id: data._id,
                    title: data.name,
                    excerpt: data.description,
                    featuredImage: data.avatar,
                    status: (data.status || 'draft').toLowerCase(),
                    category: data.category || [],
                };
            }
            return null;
        },
    });
};

export const useDeleteBlog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteBlog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOGS] });
        },
    });
};

// Hooks cho BlogTag CRUD
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

export const useBlogTypes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TYPES],
        queryFn: getBlogTypes,
        staleTime: 5 * 60 * 1000,
    });
};

export const useBlogStatuses = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_STATUSES],
        queryFn: getBlogStatuses,
        staleTime: 5 * 60 * 1000,
    });
};






