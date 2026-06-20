import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { syncPrizeStructure, getPrizeStructuresByRegion } from '../../../api/prize-structure.api';
import { PrizeStructureSyncRequest } from '../types/prize-structure';

export const useSyncPrizeStructure = () => {
    return useMutation({
        mutationFn: (data: PrizeStructureSyncRequest) => syncPrizeStructure(data),
    });
};

export const usePrizeStructuresByRegion = (initialRegion: string = 'MIEN_NAM') => {
    const [region, setRegion] = useState<string>(initialRegion);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['prize-structures', region],
        queryFn: () => getPrizeStructuresByRegion(region),
        enabled: !!region,
    });

    const filteredData = useMemo(() => {
        const rawData = response?.data || [];
        if (!search) return rawData;
        const lowerSearch = search.toLowerCase();
        return rawData.filter(item => 
            (item.prizeCode && item.prizeCode.toLowerCase().includes(lowerSearch)) ||
            (item.prizeDisplayName && item.prizeDisplayName.toLowerCase().includes(lowerSearch))
        );
    }, [response?.data, search]);

    const setFilter = (fieldId: string, values: string[]) => {
        if (fieldId === 'region') {
            // JiraFilter returns array, we take the first value or fallback to MIEN_NAM
            setRegion(values[0] || 'MIEN_NAM');
        }
    };

    const clearFilters = () => {
        setSearch('');
        setRegion('MIEN_NAM');
    };

    return {
        region,
        setRegion,
        search,
        setSearch,
        filters: { region, search },
        setFilter,
        clearFilters,
        page,
        setPage,
        limit,
        setLimit,
        data: filteredData,
        totalRecords: filteredData.length,
        isLoading,
        error
    };
};
