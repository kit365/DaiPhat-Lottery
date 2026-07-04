import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import type { ImportBatchImportMode } from '../pages/import-batch/utils/batchTypeLabels';

const BASE_URL = '/import-batches';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export type ImportBatchType = 'NEW' | 'SUPPLEMENTARY' | 'LATE_IMPORT' | 'ADJUSTMENT';
export type ImportBatchStatus = 'DRAFT' | 'IMPORTED' | 'IN_LEDGER';

export interface ImportBatchLine {
    id: number;
    lotteryStationId: number;
    batchType: ImportBatchType;
    declareQuantity: number;
    totalQuantity: number;
    importCost: number;
    totalCostValue: number;
    invoiceEvidenceUrl?: string;
}

export interface ImportBatch {
    id: number;
    drawDate: string;
    supplierId?: number;
    supplierName?: string;
    status: ImportBatchStatus;
    totalDeclareQuantity?: number;
    totalDeclaredCostValue?: number;
    lateImportWarning?: boolean;
    warnings?: string[];
    lines: ImportBatchLine[];
    importedAt?: string;
    createdAt?: string;
}

export interface CreateImportBatchLinePayload {
    lotteryStationId: number;
    declareQuantity: number;
    importCost: number;
}

export interface CreateImportBatchPayload {
    drawDate: string;
    supplierId: number;
    importMode: ImportBatchImportMode;
    sharedInvoiceEvidenceUrl?: string;
    lines: CreateImportBatchLinePayload[];
}

export interface ImportBatchEligibleStation {
    lotteryStationId: number;
    name: string;
    resolvedBatchType: ImportBatchType;
}

export interface ImportBatchClassificationPreview {
    resolvedBatchType: ImportBatchType;
    lateImportWarning: boolean;
    warnings: string[];
}

export const getActiveImportBatchDraft = async (): Promise<ImportBatch | null> => {
    try {
        const response = await apiApp.get(`${BASE_URL}/active-draft`, {
            ...withAuth(),
            skipGlobalErrorToast: true,
            validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        });

        if (response.status === 404) {
            return null;
        }

        return response.data?.data ?? null;
    } catch {
        return null;
    }
};

export const getImportBatchById = async (id: number | string): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const createImportBatch = async (
    payload: CreateImportBatchPayload
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(BASE_URL, payload, withAuth());
    return response.data;
};

export const getEligibleImportBatchStations = async (
    drawDate: string,
    importMode: ImportBatchImportMode
): Promise<ApiResponse<ImportBatchEligibleStation[]>> => {
    const response = await apiApp.get(`${BASE_URL}/eligible-stations`, {
        ...withAuth(),
        params: { drawDate, importMode },
    });
    return response.data;
};

export const previewImportBatchClassification = async (
    lotteryStationId: number,
    drawDate: string,
    importMode: ImportBatchImportMode
): Promise<ApiResponse<ImportBatchClassificationPreview>> => {
    const response = await apiApp.get(`${BASE_URL}/classify-preview`, {
        ...withAuth(),
        params: { lotteryStationId, drawDate, importMode },
    });
    return response.data;
};

export const getImportBatchTypeOptions = async (): Promise<ApiResponse<{ value: string; label: string }[]>> => {
    const response = await apiApp.get(`${BASE_URL}/batch-types`, withAuth());
    return response.data;
};
