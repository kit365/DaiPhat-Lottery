import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getProviders, deleteProvider } from '../../../api/provider.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

interface IProviderFilters {
    status?: string[];
    region?: string[];
    drawDay?: string[];
    search?: string;
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

export const useProviderList = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<IProviderFilters>({
        status: [],
        region: [],
        drawDay: [],
        search: '',
        page: 1,
        limit: 10,
    });

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: [QUERY_KEYS.PROVIDERS, filters],
        queryFn: () => getProviders({
            search: filters.search,
            status: filters.status && filters.status.length > 0 ? filters.status.join(',') : undefined,
            region: filters.region && filters.region.length > 0 ? filters.region.join(',') : undefined,
            drawDay: filters.drawDay && filters.drawDay.length > 0 ? filters.drawDay.join(',') : undefined,
            sortBy: filters.sortBy,
            direction: filters.direction,
            page: filters.page,
            limit: filters.limit,
        }),
        placeholderData: keepPreviousData,
    });

    const providers = useMemo(() => {
        if (!data?.data?.recordList) return [];
        return data.data.recordList;
    }, [data]);

    const pagination = data?.data?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const deleteMutation = useMutation({
        mutationFn: deleteProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDERS] });
        }
    });

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => {
            if ((prev.search || '') === (search || '')) {
                return prev;
            }
            return { ...prev, search, page: 1 };
        });
    };

    const setPage = (page: number) => {
        setFilters((prev) => (prev.page === page ? prev : { ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => (prev.limit === limit ? prev : { ...prev, limit, page: 1 }));
    };

    const setSort = (sortBy?: string, direction?: string) => {
        setFilters((prev) => {
            if (prev.sortBy === sortBy && prev.direction === direction) {
                return prev;
            }
            return { ...prev, sortBy, direction, page: 1 };
        });
    };

    const clearFilters = () => {
        setFilters({
            status: [],
            region: [],
            drawDay: [],
            search: '',
            page: 1,
            limit: 10,
        });
    };

    return {
        providers,
        pagination,
        isLoading,
        isFetching,
        error,
        filters,
        setFilter,
        setSearchFilter,
        setPage,
        setLimit,
        setSort,
        clearFilters,
        deleteProvider: deleteMutation.mutate,
    };
};
