import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviders, createProvider, getProviderById, updateProvider, deleteProvider } from '../../../api/provider.api';


export const useProviders = (params?: any) => {
    return useQuery({
        queryKey: ['providers', params],
        queryFn: () => getProviders(params),
    });
};

export const useCreateProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providers'] });
        },
    });
};

export const useUpdateProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateProvider(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['providers'] });
                queryClient.invalidateQueries({ queryKey: ['provider'] });
            }
        },
    });
};

export const useProviderDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['provider', id],
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
            queryClient.invalidateQueries({ queryKey: ['providers'] });
        },
    });
};


