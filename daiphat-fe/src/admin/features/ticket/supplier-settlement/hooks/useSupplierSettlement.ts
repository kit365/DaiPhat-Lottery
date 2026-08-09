"use client";

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getSupplierSettlementById,
    getSupplierSettlementOverview,
    getSupplierSettlements,
} from '../services/supplierSettlementService';
import type { SupplierSettlementListParams, SupplierSettlementStatus } from '../types/supplierSettlement.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useServerPagination } from '../../../../shared/data-grid/useServerPagination';

export const useSupplierSettlements = (params?: SupplierSettlementListParams, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENTS, params],
        queryFn: () => getSupplierSettlements(params),
        select: (res: any) => res.data,
        ...options,
    });
};

export const useSupplierSettlementDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_DETAIL, id],
        queryFn: () => getSupplierSettlementById(id!),
        enabled: !!id,
        select: (res: any) => res.data ?? null,
    });
};

export const useSupplierSettlementOverview = (id?: string | number) => {
    const normalizedId =
        id !== undefined && id !== null && String(id).trim() !== '' ? String(id) : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, normalizedId],
        queryFn: () => getSupplierSettlementOverview(normalizedId!),
        enabled: !!normalizedId,
        select: (res: any) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
    });
};

interface ISupplierSettlementFilters {
    search?: string;
    status?: SupplierSettlementStatus;
    expiredOnly?: boolean;
    lotterySupplierId?: number;
    sortBy?: string;
    direction?: string;
}

export const useSupplierSettlementList = () => {
    const {
        apiPage,
        pageSize,
        paginationModel,
        onPaginationModelChange,
        resetPage,
    } = useServerPagination(10);
    const [filters, setFilters] = useState<ISupplierSettlementFilters>({
        search: '',
        status: undefined,
        expiredOnly: false,
        lotterySupplierId: undefined,
        sortBy: 'periodFrom',
        direction: 'desc',
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status: filters.status,
            lotterySupplierId: filters.lotterySupplierId,
            sortBy: filters.sortBy,
            direction: filters.direction,
            page: apiPage,
            size: pageSize,
        }),
        [apiPage, filters, pageSize]
    );

    const { data, isLoading, error } = useSupplierSettlements(queryParams, {
        placeholderData: keepPreviousData,
    });

    const allSettlements = useMemo(() => (data as any)?.recordList ?? [], [data]);

    const settlements = useMemo(() => {
        if (filters.expiredOnly) {
            return allSettlements.filter((s: any) => s.isReturnExpired);
        }
        return allSettlements;
    }, [allSettlements, filters.expiredOnly]);

    const pagination = (data as any)?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        resetPage();
    };

    const setStatusFilter = (status?: SupplierSettlementStatus) => {
        setFilters((prev) => ({ ...prev, status, expiredOnly: false }));
        resetPage();
    };

    const setExpiredOnlyFilter = (expiredOnly?: boolean) => {
        setFilters((prev) => ({ ...prev, expiredOnly: expiredOnly ?? !prev.expiredOnly }));
        resetPage();
    };

    const setSupplierFilter = (lotterySupplierId?: number) => {
        setFilters((prev) => ({ ...prev, lotterySupplierId }));
        resetPage();
    };

    const setSort = (sortBy?: string, direction?: string) => {
        setFilters((prev) => ({
            ...prev,
            sortBy: sortBy || 'periodFrom',
            direction: direction || 'desc',
        }));
        resetPage();
    };

    return {
        allSettlements,
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        paginationModel,
        onPaginationModelChange,
        setSearchFilter,
        setStatusFilter,
        setExpiredOnlyFilter,
        setSupplierFilter,
        setSort,
    };
};
