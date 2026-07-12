import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlogs, createBlog, getBlogById, updateBlog, deleteBlog, getBlogTypes, getBlogStatuses } from '../services/blogService';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { BlogPostResponse, UpdateBlogPostRequest, BlogQueryParams } from '../types/blog.type';
import { QUERY_KEYS } from "../constants/queryKeys";
import { QUERY_KEYS as SHARED_QUERY_KEYS } from "../../../../constants/queryKeys";
import { BLOG_STATUS } from '../types/blog.type';

const BLOG_ADMIN_REFETCH_INTERVAL_MS = 30_000;

const toDateTimeLocalValue = (value?: string | null) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

export const useBlogs = (params?: BlogQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOGS, params],
        queryFn: () => getBlogs(params),
        refetchInterval: BLOG_ADMIN_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        select: (res: ApiResponse<PageResponse<BlogPostResponse>>) => {
            const data: any = res.data;
            let records: BlogPostResponse[] = [];
            let pagination = { totalRecords: 0, totalPages: 0, currentPage: 1, limit: 10, isFirst: true, isLast: true };

            if (data && typeof data === 'object' && 'recordList' in data) {
                records = data.recordList || [];
                pagination = {
                    totalRecords: data.pagination?.totalRecords || 0,
                    totalPages: data.pagination?.totalPages || 0,
                    currentPage: data.pagination?.currentPage || 1,
                    limit: data.pagination?.limit || 10,
                    isFirst: data.pagination?.isFirst ?? true,
                    isLast: data.pagination?.isLast ?? true,
                };
            } else if (Array.isArray(data)) {
                records = data;
            }

            return {
                recordList: records.map((item: BlogPostResponse) => ({
                    ...item,
                    // BE trả về đúng field – map thêm alias cho BlogList.tsx dùng
                    id: item.id,
                    title: item.title,
                    featuredImage: item.thumbnail || null,
                    viewCount: item.viewCount ?? 0,
                    status: (item.status || BLOG_STATUS.DRAFT).toLowerCase(),
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    category: item.category || null,
                    tags: item.tags || [],
                    slug: item.slug || '',
                    scheduledAt: item.scheduledAt || ((item.status || '').toLowerCase() === BLOG_STATUS.SCHEDULED ? item.publishedAt : null) || null,
                })),
                pagination,
                statusCounts: {
                    all: data?.statusCounts?.all ?? pagination.totalRecords ?? 0,
                    published: data?.statusCounts?.published ?? 0,
                    draft: data?.statusCounts?.draft ?? 0,
                    unpublished: data?.statusCounts?.unpublished ?? 0,
                    scheduled: data?.statusCounts?.scheduled ?? 0,
                },
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
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
        },
    });
};

export const useUpdateBlog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: UpdateBlogPostRequest }) => updateBlog(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOGS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOG_DETAIL] });
                queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
                queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
            }
        },
    });
};

export const useBlogDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_DETAIL, id],
        queryFn: () => getBlogById(id!),
        enabled: !!id,
        refetchInterval: BLOG_ADMIN_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        select: (res: ApiResponse<BlogPostResponse>) => {
            const data = (res.data || res) as BlogPostResponse;
            if (data) {
                return {
                    ...data,
                    // ── Form-compatible aliases ─────────────────────────
                    name: data.title || '',
                    description: data.summary || '',
                    content: data.content || '',
                    avatar: data.thumbnail || '',
                    status: (data.status || BLOG_STATUS.DRAFT).toLowerCase(),
                    type: (data.type || '').toLowerCase(),
                    slug: data.slug || '',
                    scheduledAt: toDateTimeLocalValue(
                        data.scheduledAt || (data.status === BLOG_STATUS.SCHEDULED ? data.publishedAt : null) || null
                    ),

                    // ── Form category: id array for CategoryTreeSelect ──
                    category: data.category
                        ? [String(data.category.id)]
                        : [],

                    // ── Form tags: id array ─────────────────────────────
                    tags: Array.isArray(data.tags)
                        ? data.tags.map((t: { id?: number }) => t.id ?? t)
                        : [],

                    // ── Detail-page raw objects ─────────────────────────
                    categoryRaw: data.category || null,
                    tagsRaw: Array.isArray(data.tags) ? data.tags : [],

                    // ── Detail-page metadata ────────────────────────────
                    viewCount: data.viewCount ?? 0,
                    publishedAt: data.publishedAt || null,
                    createdBy: data.createdBy || null,
                    lastModifiedBy: data.lastModifiedBy || null,
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                    isDeleted: data.isDeleted ?? false,
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
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_POSTS] });
            queryClient.invalidateQueries({ queryKey: [SHARED_QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
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
