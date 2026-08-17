"use client";

import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    completeSettlementReconciliation,
    confirmSettlementMatching,
    downloadSupplierSettlementReconciliationReport,
    checkImportFiles,
    getSupplierSettlementById,
    getSupplierSettlementOverview,
    getSupplierSettlements,
    listImportResolvableTickets,
    updateSupplierSettlementPaymentEvidenceUrls,
    listMissingReturnTickets,
    recalculateSettlementReconciliation,
    resolveImportDiscrepancy,
    resolveReturnDiscrepancy,
    resolveUnitPriceDiscrepancy,
    addSettlementMonetaryAdjustment,
} from '../services/supplierSettlementService';
import type {
    ConfirmSettlementMatchingPayload,
    ResolveImportDiscrepancyPayload,
    ResolveReturnDiscrepancyPayload,
    ResolveUnitPriceDiscrepancyPayload,
    AddSettlementMonetaryAdjustmentPayload,
    SupplierSettlementListParams,
    SupplierSettlementStatus,
} from '../types/supplierSettlement.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useServerPagination } from '../../../../shared/data-grid/useServerPagination';

export const useSupplierSettlements = (params?: SupplierSettlementListParams, options?: any) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENTS, params],
        queryFn: () => getSupplierSettlements(params),
        select: (res: any) => res.data,
        ...options,
    });
};

export const useSupplierSettlementDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_DETAIL, id],
        queryFn: () => getSupplierSettlementById(id!),
        enabled: !!id,
        select: (res: any) => res.data ?? null,
    });
};

export const useSupplierSettlementOverview = (id?: string | number) => {
    const normalizedId =
        id !== undefined && id !== null && String(id).trim() !== '' ? String(id) : undefined;

    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, normalizedId],
        queryFn: () => getSupplierSettlementOverview(normalizedId!),
        enabled: !!normalizedId,
        select: (res: any) => res.data ?? null,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

const invalidateSettlement = (queryClient: ReturnType<typeof useQueryClient>, id?: string | number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, String(id)] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_DETAIL, id] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENTS] });
};

export const useConfirmSettlementMatching = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ConfirmSettlementMatchingPayload) => confirmSettlementMatching(id!, payload),
        onSuccess: (res) => {
            const updated = res?.data;
            const cacheKey = [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, String(id)];
            if (updated) {
                queryClient.setQueryData(cacheKey, (old: any) => {
                    if (!old || typeof old !== 'object') {
                        return old;
                    }
                    // Cache stores ApiResponse<Overview>; `select` unwraps `.data`.
                    if (old.data?.settlement) {
                        return {
                            ...old,
                            data: {
                                ...old.data,
                                settlement: {
                                    ...old.data.settlement,
                                    ...updated,
                                },
                            },
                        };
                    }
                    if (old.settlement) {
                        return {
                            ...old,
                            settlement: {
                                ...old.settlement,
                                ...updated,
                            },
                        };
                    }
                    return old;
                });
            }
            invalidateSettlement(queryClient, id);
        },
    });
};

export const useMissingReturnTickets = (id?: string | number, enabled = false) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, id, 'missing-return'],
        queryFn: () => listMissingReturnTickets(id!),
        enabled: !!id && enabled,
        select: (res: any) => res.data ?? [],
    });
};

export const useImportResolvableTickets = (id?: string | number, enabled = false) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, id, 'import-resolvable'],
        queryFn: () => listImportResolvableTickets(id!),
        enabled: !!id && enabled,
        select: (res: any) => res.data ?? [],
    });
};

export const useImportFileCheck = (id?: string | number, enabled = false) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENT_OVERVIEW, id, 'import-file-check'],
        queryFn: () => checkImportFiles(id!),
        enabled: !!id && enabled,
        select: (res: any) => res.data ?? null,
        staleTime: 0,
    });
};

export const useResolveImportDiscrepancy = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ResolveImportDiscrepancyPayload) => resolveImportDiscrepancy(id!, payload),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useResolveReturnDiscrepancy = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ResolveReturnDiscrepancyPayload) => resolveReturnDiscrepancy(id!, payload),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useResolveUnitPriceDiscrepancy = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ResolveUnitPriceDiscrepancyPayload) => resolveUnitPriceDiscrepancy(id!, payload),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useAddSettlementMonetaryAdjustment = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddSettlementMonetaryAdjustmentPayload) =>
            addSettlementMonetaryAdjustment(id!, payload),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useRecalculateSettlementReconciliation = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => recalculateSettlementReconciliation(id!),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useCompleteSettlementReconciliation = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (note?: string) => completeSettlementReconciliation(id!, note),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useUpdateSettlementPaymentEvidence = (id?: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (urls: string[]) => updateSupplierSettlementPaymentEvidenceUrls(id!, urls),
        onSuccess: () => invalidateSettlement(queryClient, id),
    });
};

export const useDownloadSettlementReconciliationReport = (id?: string | number) => {
    return useMutation({
        mutationFn: (fileName?: string) => downloadSupplierSettlementReconciliationReport(id!, fileName),
    });
};

interface ISupplierSettlementFilters {
    search?: string;
    status?: SupplierSettlementStatus;
    expiredOnly?: boolean;
    lotterySupplierId?: number;
    sortBy?: string;
    direction?: string;
}

export const useSupplierSettlementList = () => {
    const {
        apiPage,
        pageSize,
        paginationModel,
        onPaginationModelChange,
        resetPage,
    } = useServerPagination(10);
    const [filters, setFilters] = useState<ISupplierSettlementFilters>({
        search: '',
        status: undefined,
        expiredOnly: false,
        lotterySupplierId: undefined,
        sortBy: 'periodFrom',
        direction: 'desc',
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status: filters.status,
            lotterySupplierId: filters.lotterySupplierId,
            sortBy: filters.sortBy,
            direction: filters.direction,
            page: apiPage,
            size: pageSize,
        }),
        [apiPage, filters, pageSize]
    );

    const { data, isLoading, error } = useSupplierSettlements(queryParams, {
        placeholderData: keepPreviousData,
    });

    const allSettlements = useMemo(() => (data as any)?.recordList ?? [], [data]);

    const settlements = useMemo(() => {
        if (filters.expiredOnly) {
            return allSettlements.filter((s: any) => s.isReturnExpired);
        }
        return allSettlements;
    }, [allSettlements, filters.expiredOnly]);

    const pagination = (data as any)?.pagination || {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        resetPage();
    };

    const setStatusFilter = (status?: SupplierSettlementStatus) => {
        setFilters((prev) => ({ ...prev, status, expiredOnly: false }));
        resetPage();
    };

    const setExpiredOnlyFilter = (expiredOnly?: boolean) => {
        setFilters((prev) => ({ ...prev, expiredOnly: expiredOnly ?? !prev.expiredOnly }));
        resetPage();
    };

    const setSupplierFilter = (lotterySupplierId?: number) => {
        setFilters((prev) => ({ ...prev, lotterySupplierId }));
        resetPage();
    };

    const setSort = (sortBy?: string, direction?: string) => {
        setFilters((prev) => ({
            ...prev,
            sortBy: sortBy || 'periodFrom',
            direction: direction || 'desc',
        }));
        resetPage();
    };

    return {
        allSettlements,
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        paginationModel,
        onPaginationModelChange,
        setSearchFilter,
        setStatusFilter,
        setExpiredOnlyFilter,
        setSupplierFilter,
        setSort,
    };
};
