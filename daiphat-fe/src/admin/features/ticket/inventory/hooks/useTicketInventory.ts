"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
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

/**
 * Status options come from a wide (up to 1000 tickets) background query. A busy draw date can take
 * longer than the global 15s timeout; failing it must not raise the "cannot reach server" toast
 * while the visible page loaded fine.
 */
const STATUS_DISCOVERY_REQUEST_CONFIG = {
    timeout: 60_000,
    skipGlobalErrorToast: true,
};

/** Controller cho trang kho vé (filter/pagination nội bộ). List theo params → dùng `useTickets`. */
export const useTicketInventory = (
    initialFilters?: Partial<ITicketFilters>,
    initialPageSize = 10,
) => {
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

    const { data: statusDiscoveryData } = useTickets(
        statusDiscoveryParams,
        { placeholderData: keepPreviousData },
        STATUS_DISCOVERY_REQUEST_CONFIG
    );

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

    const setFilter = useCallback((fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values }));
        resetPage();
    }, [resetPage]);

    const setDateRangeFilter = useCallback((drawDateFrom?: string, drawDateTo?: string) => {
        setFilters((prev) => ({ ...prev, drawDateFrom, drawDateTo }));
        resetPage();
    }, [resetPage]);

    const setImportBatchLineId = useCallback((importBatchLineId: number | null) => {
        setFilters((prev) => ({ ...prev, importBatchLineId }));
        resetPage();
    }, [resetPage]);

    const setSearchFilter = useCallback((search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        resetPage();
    }, [resetPage]);

    const clearFilters = useCallback(() => {
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
    }, [resetPage]);

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
    };
};
