"use client";

import { QUERY_KEYS } from '../constants/queryKeys';
import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { deleteTicket } from '../services/ticketService';
import { useTickets } from './useTicket';
import { resolveAvailableTicketQuantity } from '../utils/ticketQuantity';
import { buildTicketStatusFilterOptions } from '../constants/ticket-status.config';
import { useServerPagination } from '../../../../shared/data-grid/useServerPagination';

interface ITicketFilters {
    status?: string[];
    batchCode?: string[];
    provider?: string[];
    drawDate?: string[];
    drawDateFrom?: string;
    drawDateTo?: string;
    importBatchLineId?: number | null;
    search?: string;
}

/** Controller cho trang kho vé (filter/pagination nội bộ). List theo params → dùng `useTickets`. */
export const useTicketInventory = (
    initialFilters?: Partial<ITicketFilters>,
    initialPageSize = 10,
) => {
    const queryClient = useQueryClient();
    const {
        apiPage,
        pageSize,
        paginationModel,
        onPaginationModelChange,
        resetPage,
    } = useServerPagination(initialPageSize);
    const [filters, setFilters] = useState<ITicketFilters>({
        status: [],
        batchCode: [],
        provider: [],
        drawDate: [],
        drawDateFrom: undefined,
        drawDateTo: undefined,
        importBatchLineId: null,
        search: '',
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
            page: apiPage,
            limit: pageSize,
        }),
        [apiPage, filters, pageSize]
    );

    const statusDiscoveryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            stationId: filters.provider && filters.provider.length > 0 ? filters.provider.join(',') : undefined,
            drawDate: filters.drawDate && filters.drawDate.length > 0 ? filters.drawDate.join(',') : undefined,
            drawDateFrom: filters.drawDateFrom || undefined,
            drawDateTo: filters.drawDateTo || undefined,
            importBatchLineId: filters.importBatchLineId || undefined,
            page: 1,
            limit: 1000,
        }),
        [
            filters.search,
            filters.provider,
            filters.drawDate,
            filters.drawDateFrom,
            filters.drawDateTo,
            filters.importBatchLineId,
        ]
    );

    const { data: statusDiscoveryData } = useTickets(statusDiscoveryParams, {
        placeholderData: keepPreviousData,
    });

    const { data, isLoading, error } = useTickets(queryParams, {
        placeholderData: keepPreviousData,
    });

    const tickets = useMemo(() => {
        const d = (data as any)?.data || (data as any);
        if (!d?.recordList) return [];

        return d.recordList.map((item: any) => ({
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

    const availableTicketStatusOptions = useMemo(
        () => buildTicketStatusFilterOptions(((statusDiscoveryData as any)?.data?.recordList || (statusDiscoveryData as any)?.recordList) ?? []),
        [statusDiscoveryData]
    );

    useEffect(() => {
        if (!filters.status || filters.status.length === 0) {
            return;
        }

        const validStatuses = filters.status.filter((status) =>
            availableTicketStatusOptions.some((option) => option.value === status)
        );

        if (validStatuses.length !== filters.status.length) {
            setFilters((prev) => ({ ...prev, status: validStatuses }));
            resetPage();
        }
    }, [availableTicketStatusOptions, filters.status, resetPage]);

    const pagination = (data as any)?.data?.pagination || (data as any)?.pagination || {
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
        setFilters((prev) => ({ ...prev, [fieldId]: values }));
        resetPage();
    };

    const setDateRangeFilter = (drawDateFrom?: string, drawDateTo?: string) => {
        setFilters((prev) => ({ ...prev, drawDateFrom, drawDateTo }));
        resetPage();
    };

    const setImportBatchLineId = (importBatchLineId: number | null) => {
        setFilters((prev) => ({ ...prev, importBatchLineId }));
        resetPage();
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        resetPage();
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
        });
        resetPage();
    };

    return {
        tickets,
        pagination,
        availableTicketStatusOptions,
        isLoading,
        error,
        filters,
        paginationModel,
        onPaginationModelChange,
        setFilter,
        setDateRangeFilter,
        setImportBatchLineId,
        setSearchFilter,
        clearFilters,
        deleteTicket: deleteMutation.mutate,
    };
};
