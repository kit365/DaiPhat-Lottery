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
export type ImportBatchStatus = 'DRAFT' | 'RECEIVING' | 'PARTIALLY_IMPORTED' | 'CANCELLED' | 'IMPORTED' | 'IN_LEDGER';
export type ImportBatchLineStatus = 'OPEN' | 'IMPORTING' | 'IMPORTED' | 'CANCELLED';

export interface ImportBatchLine {
    id: number;
    lotteryStationId: number;
    batchType: ImportBatchType;
    batchCode?: string;
    declareQuantity: number;
    declaredCostValue?: number;
    totalQuantity: number;
    importCost: number;
    totalCostValue: number;
    status?: ImportBatchLineStatus;
    importedAt?: string;
    cancelReason?: string;
}

export interface ImportBatch {
    id: number;
    batchCode?: string;
    drawDate: string;
    supplierId?: number;
    supplierName?: string;
    supplierSettlementId?: number;
    importMode?: ImportBatchImportMode;
    invoiceEvidenceUrl?: string;
    status: ImportBatchStatus;
    cancelReason?: string;
    lineCount?: number;
    totalDeclareQuantity?: number;
    totalDeclaredCostValue?: number;
    totalImportedQuantity?: number;
    totalImportedCostValue?: number;
    submittedAt?: string;
    completedAt?: string;
    ledgerAt?: string;
    note?: string;
    lateImportWarning?: boolean;
    warnings?: string[];
    lines: ImportBatchLine[];
    importedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpdateImportBatchLinePayload {
    id?: number;
    lotteryStationId: number;
    declareQuantity: number;
    importCost: number;
    removed?: boolean;
}

export interface UpdateImportBatchPayload {
    supplierId: number;
    invoiceEvidenceUrl?: string;
    lines?: UpdateImportBatchLinePayload[];
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
    invoiceEvidenceUrl?: string;
    note?: string;
    /**
     * When true, bypass the soft duplicate check for an unfinished batch.
     * The backend will still enforce per-station hard conflicts.
     */
    forceCreate?: boolean;
    lines: CreateImportBatchLinePayload[];
}

export interface ImportBatchEligibleStation {
    lotteryStationId: number;
    name: string;
    resolvedBatchType: ImportBatchType;
}

export interface ImportBatchBlockedStation {
    lotteryStationId: number;
    name: string;
    existingDraftBatchId?: number;
    blockedReason?: string;
}

export interface ImportBatchEligibleStationsResult {
    eligible: ImportBatchEligibleStation[];
    blocked: ImportBatchBlockedStation[];
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

export interface ImportBatchListParams {
    page?: number;
    size?: number;
    lotteryStationId?: number;
    drawDate?: string;
    status?: ImportBatchStatus;
    batchType?: ImportBatchType;
    sortBy?: string;
    direction?: string;
}

export const getImportBatches = async (
    params?: ImportBatchListParams
): Promise<ApiResponse<{ recordList: ImportBatch[]; pagination: { totalRecords: number; currentPage: number; limit: number; totalPages: number } }>> => {
    const response = await apiApp.get(BASE_URL, {
        ...withAuth(),
        params,
    });
    return response.data;
};

export const createImportBatch = async (
    payload: CreateImportBatchPayload
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(BASE_URL, payload, {
        ...withAuth(),
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const updateImportBatch = async (
    id: number | string,
    payload: UpdateImportBatchPayload
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, {
        ...withAuth(),
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export interface ImportBatchTimePolicy {
    lateImportTime: string;
    importBatchCutoffTime: string;
}

export const getImportBatchTimePolicy = async (): Promise<ApiResponse<ImportBatchTimePolicy>> => {
    const response = await apiApp.get(`${BASE_URL}/time-policy`, withAuth());
    return response.data;
};

export const getEligibleImportBatchStations = async (
    drawDate: string,
    importMode: ImportBatchImportMode,
    excludeBatchId?: number | string
): Promise<ApiResponse<ImportBatchEligibleStationsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/eligible-stations`, {
        ...withAuth(),
        params: {
            drawDate,
            importMode,
            ...(excludeBatchId != null ? { excludeBatchId } : {}),
        },
    });
    return response.data;
};

export const previewImportBatchClassification = async (
    lotteryStationId: number,
    drawDate: string,
    importMode: ImportBatchImportMode,
    excludeBatchId?: number | string
): Promise<ApiResponse<ImportBatchClassificationPreview>> => {
    const response = await apiApp.get(`${BASE_URL}/classify-preview`, {
        ...withAuth(),
        skipGlobalErrorToast: true,
        params: {
            lotteryStationId,
            drawDate,
            importMode,
            ...(excludeBatchId != null ? { excludeBatchId } : {}),
        },
    });
    return response.data;
};

export const getIncompleteImportBatches = async (): Promise<ImportBatch[]> => {
    const response = await apiApp.get(`${BASE_URL}/incomplete`, {
        ...withAuth(),
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const getImportBatchesWithoutLines = async (): Promise<ImportBatch[]> => {
    const response = await apiApp.get(`${BASE_URL}/without-lines`, {
        ...withAuth(),
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const deleteImportBatchLine = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.delete(`${BASE_URL}/${batchId}/lines/${lineId}`, withAuth());
    return response.data;
};

export const getImportBatchTypeOptions = async (): Promise<ApiResponse<{ value: string; label: string }[]>> => {
    const response = await apiApp.get(`${BASE_URL}/batch-types`, withAuth());
    return response.data;
};
