import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSuppliers } from '../../../api/supplier.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

interface ISupplierFilters {
    search?: string;
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

export const useSupplierList = () => {
    const [filters, setFilters] = useState<ISupplierFilters>({
        search: '',
        sortBy: 'name',
        direction: 'asc',
        page: 1,
        limit: 10,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.SUPPLIERS, filters],
        queryFn: () =>
            getSuppliers({
                search: filters.search || undefined,
                sortBy: filters.sortBy,
                direction: filters.direction,
                page: filters.page,
                size: filters.limit,
            }),
        placeholderData: keepPreviousData,
    });

    const suppliers = useMemo(() => data?.data?.recordList ?? [], [data]);

    const pagination = data?.data?.pagination || {
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
