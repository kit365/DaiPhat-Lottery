import { apiApp } from '../../../../../api';
import { withAuthHeaders } from '../../../../../api/authHeaders';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import type {
    ConfirmSettlementMatchingPayload,
    ResolveImportDiscrepancyPayload,
    ResolveReturnDiscrepancyPayload,
    ResolveUnitPriceDiscrepancyPayload,
    AddSettlementMonetaryAdjustmentPayload,
    SettlementCompleteResult,
    SettlementImportFileCheck,
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

export const checkImportFiles = async (
    id: number | string
): Promise<ApiResponse<SettlementImportFileCheck>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/reconciliation/import-file-check`, withAuthHeaders());
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

export const updateSupplierSettlementPaymentEvidenceUrls = async (
    id: number | string,
    paymentEvidenceUrls: string[]
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/payment-evidence`,
        { paymentEvidenceUrls }
    );
    return response.data;
};

const blobRequestConfig = () =>
    ({
        ...withAuthHeaders(),
        responseType: 'blob' as const,
        skipGlobalErrorToast: true,
    }) as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean };

const openPdfBlob = async (blob: Blob, fileName: string): Promise<void> => {
    const contentType = String(blob.type || '').toLowerCase();
    if (!contentType.includes('pdf')) {
        let message = 'Không mở được báo cáo PDF';
        try {
            const parsed = JSON.parse(await blob.text());
            if (parsed?.message) message = parsed.message;
        } catch {
            // keep default
        }
        throw new Error(message);
    }
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank');
    if (opened) {
        opened.opener = null;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
    }
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const downloadSupplierSettlementReconciliationReport = async (
    id: number | string,
    fileName?: string
): Promise<void> => {
    const response = await apiApp.get(
        `${BASE_URL}/${id}/reconciliation/report`,
        blobRequestConfig()
    );
    await openPdfBlob(
        response.data as Blob,
        fileName || `bao-cao-doi-soat-${id}.pdf`
    );
};

export type { SupplierSettlementReconciliationPhase };
