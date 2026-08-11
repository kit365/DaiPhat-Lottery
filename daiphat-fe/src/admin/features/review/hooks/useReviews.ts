"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getReviews, changeReviewStatus, deleteReview } from "@/admin/features/review/services/reviewService";
import { useServerPagination } from '../../../shared/data-grid/useServerPagination';

interface IReviewFilters {
    status?: string;
    search?: string;
}

export const useReviews = () => {
    const queryClient = useQueryClient();
    const {
        apiPage,
        pageSize,
        paginationModel,
        onPaginationModelChange,
        resetPage,
    } = useServerPagination(10);
    const [filters, setFilters] = useState<IReviewFilters>({
        status: 'all',
        search: '',
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-reviews', filters, apiPage, pageSize],
        queryFn: () => getReviews({
            status: filters.status,
            page: apiPage,
            limit: pageSize,
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
        setFilters((prev) => ({ ...prev, status }));
        resetPage();
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        resetPage();
    };

    return {
        reviews,
        pagination,
        isLoading,
        error,
        filters,
        paginationModel,
        onPaginationModelChange,
        setStatusFilter,
        setSearchFilter,
        changeStatus: statusMutation.mutate,
        deleteReview: deleteMutation.mutate
    };
};
