import Cookies from 'js-cookie';
import { apiApp } from '../../../../../api';
import { ApiResponse } from '../../../../../types/api.type';
import { STORAGE_KEYS } from '../../../../../constants/storage.constants';
import type { ImportBatchImportMode } from '../utils/batchTypeLabels';
import type {
    CreateImportBatchPayload,
    ImportBatch,
    ImportBatchClassificationPreview,
    ImportBatchEligibleStationsResult,
    ImportBatchListParams,
    ImportBatchReductionTicketsResult,
    ImportBatchLineEntryTicketsResult,
    ImportBatchTimePolicy,
    UpdateImportBatchPayload,
} from '../types/importBatch.type';

const BASE_URL = '/import-batches';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

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

export const getImportBatchById = async (
    id: number | string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const getImportBatches = async (
    params?: ImportBatchListParams
): Promise<
    ApiResponse<{
        recordList: ImportBatch[];
        pagination: {
            totalRecords: number;
            currentPage: number;
            limit: number;
            totalPages: number;
        };
    }>
> => {
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

/** Attach invoice evidence when the batch currently has none (settlement / fill-in). */
export const attachImportBatchInvoiceEvidence = async (
    id: number | string,
    invoiceEvidenceUrl: string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/invoice-evidence`,
        { invoiceEvidenceUrl },
        {
            ...withAuth(),
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

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

export const pauseImportBatchLine = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${batchId}/lines/${lineId}/pause`,
        {},
        {
            ...withAuth(),
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

export const resumeImportBatchLine = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${batchId}/lines/${lineId}/resume`,
        {},
        {
            ...withAuth(),
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

export const getImportBatchReductionTickets = async (
    batchId: number | string
): Promise<ApiResponse<ImportBatchReductionTicketsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/${batchId}/reduction-tickets`, withAuth());
    return response.data;
};

export const getImportBatchLineEntryTickets = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatchLineEntryTicketsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/${batchId}/lines/${lineId}/entry-tickets`, {
        ...withAuth(),
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const getImportBatchTypeOptions = async (): Promise<
    ApiResponse<{ value: string; label: string }[]>
> => {
    const response = await apiApp.get(`${BASE_URL}/batch-types`, withAuth());
    return response.data;
};
