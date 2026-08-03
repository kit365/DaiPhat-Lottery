"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getReviews, changeReviewStatus, deleteReview } from '../../../api/review.api';

interface IReviewFilters {
    status?: string;
    search?: string;
    page: number;
    limit: number;
}

export const useReviews = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<IReviewFilters>({
        status: 'all',
        search: '',
        page: 1,
        limit: 10,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-reviews', filters],
        queryFn: () => getReviews({
            status: filters.status,
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
        }),
        placeholderData: keepPreviousData,
    });

    const reviews = useMemo(() => {
        if (!data?.data?.recordList) return [];

        return data.data.recordList.map((item: any) => ({
            id: item._id,
            userName: item.userName,
            userAvatar: item.userAvatar,
            userEmail: item.userEmail,
            ticketName: item.ticketName,
            ticketImage: item.ticketImage,
            rating: item.rating,
            comment: item.comment,
            status: item.status,
            images: item.images || [],
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        }));
    }, [data]);

    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => changeReviewStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        }
    });

    const setStatusFilter = (status: string) => {
        setFilters((prev) => ({ ...prev, status, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => ({ ...prev, limit, page: 1 }));
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    return {
        reviews,
        pagination,
        isLoading,
        error,
        filters,
        setStatusFilter,
        setSearchFilter,
        setPage,
        setLimit,
        changeStatus: statusMutation.mutate,
        deleteReview: deleteMutation.mutate
    };
};
