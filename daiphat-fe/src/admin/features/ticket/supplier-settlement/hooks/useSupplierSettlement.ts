"use client";

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getSupplierSettlementById,
    getSupplierSettlementOverview,
    getSupplierSettlements,
} from '../services/supplierSettlementService';
import type { SupplierSettlementListParams } from '../types/supplierSettlement.type';
import { QUERY_KEYS } from '../constants/queryKeys';

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
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

export const useSupplierSettlementList = () => {
    const [filters, setFilters] = useState<ISupplierSettlementFilters>({
        search: '',
        sortBy: 'periodFrom',
        direction: 'desc',
        page: 1,
        limit: 10,
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            sortBy: filters.sortBy,
            direction: filters.direction,
            page: filters.page,
            size: filters.limit,
        }),
        [filters]
    );

    const { data, isLoading, error } = useSupplierSettlements(queryParams, {
        placeholderData: keepPreviousData,
    });

    const settlements = useMemo(() => (data as any)?.recordList ?? [], [data]);

    const pagination = (data as any)?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
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

    const setSort = (sortBy?: string, direction?: string) => {
        setFilters((prev) => ({
            ...prev,
            sortBy: sortBy || 'periodFrom',
            direction: direction || 'desc',
            page: 1,
        }));
    };

    return {
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setPage,
        setLimit,
        setSort,
    };
};
