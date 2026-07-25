import { QUERY_KEYS } from '../constants/queryKeys';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { deleteTicket } from '../services/ticketService';
import { useTickets } from './useTicket';
import { resolveAvailableTicketQuantity } from '../utils/ticketQuantity';

interface ITicketFilters {
    status?: string[];
    batchCode?: string[];
    provider?: string[];
    drawDate?: string[];
    drawDateFrom?: string;
    drawDateTo?: string;
    importBatchLineId?: number | null;
    search?: string;
    page: number;
    limit: number;
}

/** Controller cho trang kho vé (filter/pagination nội bộ). List theo params → dùng `useTickets`. */
export const useTicketInventory = (initialFilters?: Partial<ITicketFilters>) => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<ITicketFilters>({
        status: [],
        batchCode: [],
        provider: [],
        drawDate: [],
        drawDateFrom: undefined,
        drawDateTo: undefined,
        importBatchLineId: null,
        search: '',
        page: 1,
        limit: 10,
        ...initialFilters,
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status: filters.status && filters.status.length > 0 ? filters.status.join(',') : undefined,
            stationId: filters.provider && filters.provider.length > 0 ? filters.provider.join(',') : undefined,
            drawDate: filters.drawDate && filters.drawDate.length > 0 ? filters.drawDate.join(',') : undefined,
            drawDateFrom: filters.drawDateFrom || undefined,
            drawDateTo: filters.drawDateTo || undefined,
            importBatchLineId: filters.importBatchLineId || undefined,
            page: filters.page,
            limit: filters.limit,
        }),
        [filters]
    );

    const { data, isLoading, error } = useTickets(queryParams, {
        placeholderData: keepPreviousData,
    });

    const tickets = useMemo(() => {
        if (!data?.data?.recordList) return [];

        return data.data.recordList.map((item: any) => ({
            ...item,
            id: item.id || item._id,
            providerName: item.productName || item.providerName || item.stationName || 'Không xác định',
            stationName: item.stationName || '',
            quantity: resolveAvailableTicketQuantity(item),
            serials: item.serials,
            serialNumber: item.serialNumber || '',
            numbers: item.numbers || '',
            drawDate: item.drawDate || '',
            batchCode: item.batchCode || '',
            image: item.ticketImg || item.avatar || '',
            createdAt: item.importedAt || item.createdAt ? new Date(item.importedAt || item.createdAt) : new Date(),
            status: item.status || 'DRAFT',
            statusDisplayName: item.statusDisplayName || item.status,
        }));
    }, [data]);

    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const deleteMutation = useMutation({
        mutationFn: deleteTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
        },
    });

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
    };

    const setDateRangeFilter = (drawDateFrom?: string, drawDateTo?: string) => {
        setFilters((prev) => ({ ...prev, drawDateFrom, drawDateTo, page: 1 }));
    };

    const setImportBatchLineId = (importBatchLineId: number | null) => {
        setFilters((prev) => ({ ...prev, importBatchLineId, page: 1 }));
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
            drawDate: [],
            drawDateFrom: undefined,
            drawDateTo: undefined,
            importBatchLineId: null,
            search: '',
            page: 1,
            limit: 10,
        });
    };

    return {
        tickets,
        pagination,
        isLoading,
        error,
        filters,
        setFilter,
        setDateRangeFilter,
        setImportBatchLineId,
        setSearchFilter,
        setPage,
        setLimit,
        clearFilters,
        deleteTicket: deleteMutation.mutate,
    };
};
