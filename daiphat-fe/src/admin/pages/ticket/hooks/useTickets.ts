import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getTickets, deleteTicket, restoreTicket, forceDeleteTicket } from '../../../api/ticket.api';

interface ITicketFilters {
    status?: string[];
    stock?: string[];
    search?: string;
    page: number;
    limit: number;
    isTrash?: boolean;
}

export const useTickets = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<ITicketFilters>({
        status: [],
        stock: [],
        search: '',
        page: 1,
        limit: 10,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['tickets', filters],
        queryFn: () => getTickets({
            keyword: filters.search,
            status: filters.status && filters.status.length > 0 ? filters.status.join(',') : undefined,
            page: filters.page,
            limit: filters.limit,
            is_trash: filters.isTrash || undefined,
        }),
        placeholderData: keepPreviousData,
    });

    const tickets = useMemo(() => {
        if (!data?.data?.recordList) return [];

        return data.data.recordList.map((item: any) => ({
            id: item._id,
            ticket: item.name,
            category: (item.categoryInfo || []).map((c: any) => c.name).join(', ') || 'Uncategorized',
            image: item.images?.[0] || '',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            stock: item.stock || 0,
            price: item.priceNew || item.priceOld || 0,
            status: item.status || 'draft',
            providerName: item.providerName || 'N/A',
        }));
    }, [data]);

    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
        deletedCount: 0,
    };

    const deleteMutation = useMutation({
        mutationFn: deleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
    });

    const restoreMutation = useMutation({
        mutationFn: restoreTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
    });

    const forceDeleteMutation = useMutation({
        mutationFn: forceDeleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
    });

    const setStatusFilter = (status: string[]) => {
        setFilters((prev) => ({ ...prev, status, page: 1 }));
    };

    const setStockFilter = (stock: string[]) => {
        setFilters((prev) => ({ ...prev, stock, page: 1 }));
    };

    const setIsTrashFilter = (isTrash: boolean) => {
        setFilters((prev) => ({ ...prev, isTrash, page: 1 }));
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => ({ ...prev, limit, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            status: [],
            stock: [],
            search: '',
            page: 1,
            limit: 10,
            isTrash: false,
        });
    };

    return {
        tickets,
        pagination,
        isLoading,
        error,
        filters,
        setStatusFilter,
        setStockFilter,
        setSearchFilter,
        setIsTrashFilter,
        setPage,
        setLimit,
        clearFilters,
        deleteTicket: deleteMutation.mutate,
        restoreTicket: restoreMutation.mutate,
        forceDeleteTicket: forceDeleteMutation.mutate,
    };
};
