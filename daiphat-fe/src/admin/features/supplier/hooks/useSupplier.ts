import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createSupplier,
    getActiveSuppliers,
    getSupplierById,
    getSuppliers,
    updateSupplier,
} from '../services/supplierService';
import type {
    CreateLotterySupplierPayload,
    SupplierListParams,
    UpdateLotterySupplierPayload,
} from '../types/supplier.type';
import { QUERY_KEYS } from '../constants/queryKeys';

/** List theo params — cùng pattern `useStations(params)`. */
export const useSuppliers = (params?: SupplierListParams, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIERS, params],
        queryFn: () => getSuppliers(params),
        select: (res) => res.data,
        ...options,
    });
};

export const useActiveSuppliers = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIERS_ACTIVE],
        queryFn: getActiveSuppliers,
        enabled,
        staleTime: 30_000,
    });
};

export const useSupplierDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_DETAIL, id],
        queryFn: () => getSupplierById(id!),
        enabled: !!id,
        select: (res) => res.data ?? null,
    });
};

export const useCreateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateLotterySupplierPayload) => createSupplier(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS_ACTIVE] });
        },
    });
};

export const useUpdateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: number | string;
            payload: UpdateLotterySupplierPayload;
        }) => updateSupplier(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS_ACTIVE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_DETAIL, variables.id] });
        },
    });
};

interface ISupplierFilters {
    search?: string;
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

/** Controller trang danh sách NCC (filter/pagination). List theo params → dùng `useSuppliers`. */
export const useSupplierList = () => {
    const [filters, setFilters] = useState<ISupplierFilters>({
        search: '',
        sortBy: 'name',
        direction: 'asc',
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

    const { data, isLoading, error } = useSuppliers(queryParams, {
        placeholderData: keepPreviousData,
    });

    const suppliers = useMemo(() => data?.recordList ?? [], [data]);

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
            sortBy: sortBy || 'name',
            direction: direction || 'asc',
            page: 1,
        }));
    };

    return {
        suppliers,
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
