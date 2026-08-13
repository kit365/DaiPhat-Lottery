import { apiApp } from '../../../../../api';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import type {
    ConfirmSettlementMatchingPayload,
    ResolveImportDiscrepancyPayload,
    ResolveReturnDiscrepancyPayload,
    ResolveUnitPriceDiscrepancyPayload,
    AddSettlementMonetaryAdjustmentPayload,
    SettlementCompleteResult,
    SettlementResolvableSerial,
    SupplierSettlement,
    SupplierSettlementAdjustment,
    SupplierSettlementListParams,
    SupplierSettlementOverview,
} from '../types/supplierSettlement.type';
import type { SupplierSettlementReconciliationPhase } from '../types/supplierSettlement.type';

const BASE_URL = '/supplier-settlements';

export const getSupplierSettlements = async (
    params?: SupplierSettlementListParams
): Promise<ApiResponse<PageResponse<SupplierSettlement>>> => {
    const response = await apiApp.get(BASE_URL, {
        params,
    });
    return response.data;
};

export const getSupplierSettlementById = async (
    id: number | string
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};

export const getSupplierSettlementOverview = async (
    id: number | string
): Promise<ApiResponse<SupplierSettlementOverview>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/overview`);
    return response.data;
};

export const updateSupplierSettlementReceiptUrl = async (
    id: number | string,
    supplierSettlementReceiptUrl: string
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/receipt`,
        { supplierSettlementReceiptUrl }
    );
    return response.data;
};

export const confirmSettlementMatching = async (
    id: number | string,
    payload: ConfirmSettlementMatchingPayload
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/reconciliation/matching`, payload);
    return response.data;
};

export const listMissingReturnTickets = async (
    id: number | string
): Promise<ApiResponse<SettlementResolvableSerial[]>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/reconciliation/missing-return-tickets`);
    return response.data;
};

export const listImportResolvableTickets = async (
    id: number | string
): Promise<ApiResponse<SettlementResolvableSerial[]>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/reconciliation/import-resolvable-tickets`);
    return response.data;
};

export const resolveImportDiscrepancy = async (
    id: number | string,
    payload: ResolveImportDiscrepancyPayload
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/reconciliation/resolve-import`, payload);
    return response.data;
};

export const resolveReturnDiscrepancy = async (
    id: number | string,
    payload: ResolveReturnDiscrepancyPayload
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/reconciliation/resolve-return`, payload);
    return response.data;
};

export const resolveUnitPriceDiscrepancy = async (
    id: number | string,
    payload: ResolveUnitPriceDiscrepancyPayload
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/reconciliation/resolve-unit-price`, payload);
    return response.data;
};

export const addSettlementMonetaryAdjustment = async (
    id: number | string,
    payload: AddSettlementMonetaryAdjustmentPayload
): Promise<ApiResponse<SupplierSettlementAdjustment>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/reconciliation/settlement-adjustments`,
        payload
    );
    return response.data;
};

export const recalculateSettlementReconciliation = async (
    id: number | string
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/reconciliation/recalculate`, {});
    return response.data;
};

export const completeSettlementReconciliation = async (
    id: number | string,
    reconciliationNote?: string
): Promise<ApiResponse<SettlementCompleteResult>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/reconciliation/complete`,
        { reconciliationNote }
    );
    return response.data;
};

export type { SupplierSettlementReconciliationPhase };
