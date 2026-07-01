import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getProviders, deleteProvider } from '../../../api/provider.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

interface IProviderFilters {
    region?: string[];
    drawDay?: string[];
    activity?: string[];
    search?: string;
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

const DEFAULT_ACTIVITY_FILTER = ['all'];

const resolveIsActiveParam = (activity?: string[]): boolean | undefined => {
    const value = activity?.[0];
    if (!value || value === 'all') {
        return undefined;
    }
    if (value === 'active') {
        return true;
    }
    if (value === 'inactive') {
        return false;
    }
    return undefined;
};

export const useProviderList = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<IProviderFilters>({
        region: [],
        drawDay: [],
        activity: DEFAULT_ACTIVITY_FILTER,
        search: '',
        page: 1,
        limit: 10,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.PROVIDERS, filters],
        queryFn: () => getProviders({
            search: filters.search,
            region: filters.region && filters.region.length > 0 ? filters.region : undefined,
            drawDay: filters.drawDay && filters.drawDay.length > 0 ? filters.drawDay : undefined,
            isActive: resolveIsActiveParam(filters.activity),
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
        if (fieldId === 'activity') {
            const latest = values[values.length - 1];
            const nextActivity = !latest || latest === 'all' ? DEFAULT_ACTIVITY_FILTER : [latest];
            setFilters((prev) => ({ ...prev, activity: nextActivity, page: 1 }));
            return;
        }

        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
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
        setFilters((prev) => ({ ...prev, sortBy, direction, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            region: [],
            drawDay: [],
            activity: DEFAULT_ACTIVITY_FILTER,
            search: '',
            page: 1,
            limit: 10,
        });
    };

    return {
        providers,
        pagination,
        isLoading,
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
