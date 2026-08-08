"use client";

import { QUERY_KEYS } from '../constants/queryKeys';
import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getExpiredTickets } from '../services/ticketService';
import { useServerPagination } from '../../../../shared/data-grid/useServerPagination';

export const useExpiredTickets = () => {
    const {
        apiPage,
        pageSize,
        paginationModel,
        onPaginationModelChange,
    } = useServerPagination(10);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [QUERY_KEYS.EXPIRED_TICKETS, apiPage, pageSize],
        queryFn: () => getExpiredTickets({
            page: apiPage,
            limit: pageSize,
        }),
        placeholderData: keepPreviousData,
    });

    const expiredTickets = useMemo(() => {
        if (!data?.data?.recordList) return [];

        return data.data.recordList.map((item: any) => ({
            id: item._id,
            name: item.name,
            quantity: item.serials?.length || item.quantity || 0,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            discardedAt: item.discardedAt ? new Date(item.discardedAt) : new Date(),
        }));
    }, [data]);

    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    return {
        expiredTickets,
        pagination,
        isLoading,
        error,
        refetch,
        paginationModel,
        onPaginationModelChange,
    };
};
