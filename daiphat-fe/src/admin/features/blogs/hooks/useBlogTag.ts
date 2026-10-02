"use client";

import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { BlogTagQueryParams, BlogTagResponse } from '../types/blog-tag.type';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBlogTags, getBlogTags, createBlogTag, deleteBlogTag, updateBlogTag } from '../services/blogTagService';
import { QUERY_KEYS } from "../constants/queryKeys";

export const useBlogTags = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS],
        queryFn: getAllBlogTags,
        select: (res: ApiResponse<BlogTagResponse[]>) => {
            const data = res?.data ?? res;
            return Array.isArray(data) ? data : [];
        }
    });
};

export const useBlogTagsPaged = (params?: BlogTagQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.BLOG_TAGS_PAGED, params],
        queryFn: () => getBlogTags(params),
        select: (res: any) => {
            const data = res?.data ?? res;
            let records: BlogTagResponse[] = [];
            let pagination: any = { totalRecords: 0, totalPages: 0, currentPage: 1, limit: 10 };

            if (data && typeof data === 'object' && 'recordList' in data) {
                records = Array.isArray(data.recordList) ? data.recordList : [];
                pagination = {
                    totalRecords: data.pagination?.totalRecords || records.length,
                    totalPages: data.pagination?.totalPages || 0,
                    currentPage: data.pagination?.currentPage || 1,
                    limit: data.pagination?.limit || 10
                };
            } else if (Array.isArray(data)) {
                records = data;
                pagination.totalRecords = data.length;
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
