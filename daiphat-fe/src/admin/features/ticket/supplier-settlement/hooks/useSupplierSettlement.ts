import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getSupplierSettlementById,
    getSupplierSettlements,
} from '../services/supplierSettlementService';
import type { SupplierSettlementListParams } from '../types/supplierSettlement.type';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useSupplierSettlements = (params?: SupplierSettlementListParams, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENTS, params],
        queryFn: () => getSupplierSettlements(params),
        select: (res) => res.data,
        ...options,
    });
};

export const useSupplierSettlementDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_DETAIL, id],
        queryFn: () => getSupplierSettlementById(id!),
        enabled: !!id,
        select: (res) => res.data ?? null,
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

    const settlements = useMemo(() => data?.recordList ?? [], [data]);

    const pagination = data?.pagination || {
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
