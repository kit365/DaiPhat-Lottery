import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getTickets, deleteTicket, restoreTicket, forceDeleteTicket } from '../../../api/ticket.api';

interface ITicketFilters {
    status?: string[];
    batchCode?: string[];
    provider?: string[];
    search?: string;
    page: number;
    limit: number;
    isTrash?: boolean;
}

export const useTickets = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<ITicketFilters>({
        status: [],
        batchCode: [],
        provider: [],
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
            id: item.id || item._id,
            providerName: item.productName || item.providerName || 'Không xác định',
            serialNumber: item.serialNumber || '',
            numbers: item.numbers || '',
            drawDate: item.drawDate || '',
            batchCode: item.batchCode || '',
            image: item.ticketImg || item.avatar || '',
            createdAt: item.importedAt || item.createdAt ? new Date(item.importedAt || item.createdAt) : new Date(),
            status: item.status ? item.status.toLowerCase() : 'draft',
            statusDisplayName: item.statusDisplayName || item.status,
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

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
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
            batchCode: [],
            provider: [],
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
        setFilter,
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
