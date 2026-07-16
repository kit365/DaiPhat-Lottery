import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants/queryKeys';
import { PrizeStructureResponse, PrizeStructureSyncRequest } from '../types/prize-structure';
import { getPrizeStructuresByRegion, replacePrizeStructures, syncPrizeStructures } from '../services/prizeStructureService';

export const useSyncPrizeStructure = () => {
    return useMutation({
        mutationFn: (data: PrizeStructureSyncRequest) => syncPrizeStructures(data),
    });
};

export const useApprovePrizeStructurePreview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ region, items }: { region: string; items: Omit<PrizeStructureResponse, 'id' | 'regionId' | 'regionCode' | 'createdAt' | 'updatedAt'>[] }) => replacePrizeStructures(region, items),
        onSuccess: (_response, variables) => queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.PRIZE_STRUCTURES, variables.region],
        }),
    });
};

export const usePrizeStructuresByRegion = (initialRegion: string = 'MIEN_NAM') => {
    const [region, setRegion] = useState<string>(initialRegion);
    const [search, setSearch] = useState('');
    const { data: response, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.PRIZE_STRUCTURES, region],
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
        data: filteredData,
        totalRecords: filteredData.length,
        isLoading,
        error
    };
};
