import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createSupplier,
    getActiveSuppliers,
    getSupplierById,
    getSuppliers,
    updateSupplier,
    CreateLotterySupplierPayload,
    SupplierListParams,
    UpdateLotterySupplierPayload,
} from '../../../api/supplier.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

export const useSuppliers = (params?: SupplierListParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIERS, params],
        queryFn: () => getSuppliers(params),
        select: (res) => res.data,
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
        mutationFn: ({ id, payload }: { id: number | string; payload: UpdateLotterySupplierPayload }) =>
            updateSupplier(id, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS_ACTIVE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_DETAIL, variables.id] });
        },
    });
};
