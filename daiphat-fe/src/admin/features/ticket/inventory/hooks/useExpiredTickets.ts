import { QUERY_KEYS } from '../constants/queryKeys';
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getExpiredTickets } from '../services/ticketService';

export const useExpiredTickets = () => {
    const [paginationModel, setPaginationModel] = useState({
        page: 1,
        limit: 10,
    });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [QUERY_KEYS.EXPIRED_TICKETS, paginationModel],
        queryFn: () => getExpiredTickets({
            page: paginationModel.page,
            limit: paginationModel.limit,
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
        setPage: (page: number) => setPaginationModel(prev => ({ ...prev, page })),
        setLimit: (limit: number) => setPaginationModel(prev => ({ ...prev, limit, page: 1 })),
    };
};
