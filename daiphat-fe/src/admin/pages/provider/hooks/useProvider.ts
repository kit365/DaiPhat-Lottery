import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviders, createProvider, getProviderById, updateProvider, deleteProvider, getStationsToday, getStationsTomorrow, uploadProviderImage } from '../../../api/provider.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';


export const useProviders = (params?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.PROVIDERS, params],
        queryFn: () => getProviders(params),
    });
};

export const useCreateProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDERS] });
        },
    });
};

export const useUpdateProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateProvider(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDERS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDER_DETAIL] });
            }
        },
    });
};

export const useProviderDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.PROVIDER_DETAIL, id],
        queryFn: () => getProviderById(id!),
        enabled: !!id,
        select: (res: any) => {
            const data = res.data || res;
            if (data) {
                return {
                    ...data,
                    id: data._id,
                };
            }
            return null;
        },
    });
};

export const useDeleteProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROVIDERS] });
        },
    });
};

export const useStationsToday = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TODAY],
        queryFn: () => getStationsToday(),
    });
};

export const useStationsTomorrow = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TOMORROW],
        queryFn: () => getStationsTomorrow(),
    });
};

export const useUploadProviderImage = () => {
    return useMutation({
        mutationFn: ({ id, file }: { id: string | number; file: File }) => uploadProviderImage(id, file),
    });
};

