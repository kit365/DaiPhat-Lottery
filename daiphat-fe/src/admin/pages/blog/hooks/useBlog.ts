import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlogs, createBlog, getBlogById, updateBlog, deleteBlog, getBlogTags, getAllBlogTags, createBlogTag, deleteBlogTag, updateBlogTag, getBlogTypes, getBlogStatuses } from '../../../api/blog.api';
import { ApiResponse } from '../../../config/type';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { BLOG_STATUS } from "../../../../types/blogs.type";

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

export const useBlogs = (params?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOGS, params],
        queryFn: () => getBlogs(params),
        refetchInterval: BLOG_ADMIN_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
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
                    status:        (item.status || BLOG_STATUS.DRAFT).toLowerCase(),
                    createdAt:     item.createdAt,
                    updatedAt:     item.updatedAt,
                    category:      item.category   || null,
                    tags:          item.tags        || [],
                    slug:          item.slug        || '',
                    scheduledAt:   item.scheduledAt || ((item.status || '').toLowerCase() === BLOG_STATUS.SCHEDULED ? item.publishedAt : null) || null,
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
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
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
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
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
        select: (res: any) => {
            const data = res.data || res;
            if (data) {
                return {
                    ...data,
                    // ── Form-compatible aliases ─────────────────────────
                    name:        data.title     || '',
                    description: data.summary   || '',
                    content:     data.content   || '',
                    avatar:      data.thumbnail || '',
                    status:      (data.status || BLOG_STATUS.DRAFT).toLowerCase(),
                    type:        (data.type  || '').toLowerCase(),
                    slug:        data.slug  || '',
                    scheduledAt: toDateTimeLocalValue(
                        data.scheduledAt || (data.status === BLOG_STATUS.SCHEDULED ? data.publishedAt : null) || null
                    ),

                    // ── Form category: id array for CategoryTreeSelect ──
                    category: data.category
                        ? [String(data.category.id)]
                        : [],

                    // ── Form tags: id array ─────────────────────────────
                    tags: Array.isArray(data.tags)
                        ? data.tags.map((t: any) => t.id ?? t)
                        : [],

                    // ── Detail-page raw objects ─────────────────────────
                    categoryRaw: data.category || null,
                    tagsRaw: Array.isArray(data.tags) ? data.tags : [],

                    // ── Detail-page metadata ────────────────────────────
                    viewCount:      data.viewCount      ?? 0,
                    publishedAt:    data.publishedAt    || null,
                    createdBy:      data.createdBy      || null,
                    lastModifiedBy: data.lastModifiedBy || null,
                    createdAt:      data.createdAt      || null,
                    updatedAt:      data.updatedAt      || null,
                    isDeleted:      data.isDeleted      ?? false,
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
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_BLOG_CATEGORIES] });
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
