import { apiApp } from '../../../../../api';
import { withAuthHeaders } from '../../../../../api/authHeaders';
import { ApiResponse } from '../../../../../types/api.type';
import type { ImportBatchImportMode } from '../utils/batchTypeLabels';
import type {
    CreateImportBatchPayload,
    ImportBatch,
    ImportBatchClassificationPreview,
    ImportBatchEligibleStationsResult,
    ImportBatchFileCommitPayload,
    ImportBatchFileConfig,
    ImportBatchFileImportResult,
    ImportBatchFileJob,
    ImportBatchFileInspectResult,
    ImportBatchFileMapping,
    ImportBatchFileMappingProfile,
    ImportBatchFilePreviewResult,
    ImportBatchListParams,
    ImportBatchReductionTicketsResult,
    ImportBatchLineEntryTicketsResult,
    ImportBatchTimePolicy,
    UpdateImportBatchPayload,
} from '../types/importBatch.type';

const BASE_URL = '/import-batches';

export const getActiveImportBatchDraft = async (): Promise<ImportBatch | null> => {
    try {
        const response = await apiApp.get(`${BASE_URL}/active-draft`, {
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
    const response = await apiApp.get(`${BASE_URL}/${id}`);
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
        params,
    });
    return response.data;
};

export const createImportBatch = async (
    payload: CreateImportBatchPayload
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(BASE_URL, payload, {
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const updateImportBatch = async (
    id: number | string,
    payload: UpdateImportBatchPayload
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, {
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
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

export const uploadImportBatchTicketListImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/ticket-list-images/upload`, formData, {
        ...withAuthHeaders(),
        timeout: 60_000,
        skipGlobalErrorToast: true,
    });
    const url = response.data?.data?.url;
    if (!url) {
        throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
    }
    return url;
};

export const attachTicketListImages = async (
    id: number | string,
    urls: string[]
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/ticket-list-images`,
        { urls },
        {
            ...withAuthHeaders(),
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

export const getImportBatchTimePolicy = async (): Promise<ApiResponse<ImportBatchTimePolicy>> => {
    const response = await apiApp.get(`${BASE_URL}/time-policy`);
    return response.data;
};

export const getEligibleImportBatchStations = async (
    drawDate: string,
    importMode: ImportBatchImportMode,
    excludeBatchId?: number | string
): Promise<ApiResponse<ImportBatchEligibleStationsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/eligible-stations`, {
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
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const getImportBatchesWithoutLines = async (): Promise<ImportBatch[]> => {
    const response = await apiApp.get(`${BASE_URL}/without-lines`, {
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const deleteImportBatchLine = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatch>> => {
    const response = await apiApp.delete(`${BASE_URL}/${batchId}/lines/${lineId}`);
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
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};

export const getImportBatchReductionTickets = async (
    batchId: number | string
): Promise<ApiResponse<ImportBatchReductionTicketsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/${batchId}/reduction-tickets`);
    return response.data;
};

export const getImportBatchLineEntryTickets = async (
    batchId: number | string,
    lineId: number | string
): Promise<ApiResponse<ImportBatchLineEntryTicketsResult>> => {
    const response = await apiApp.get(`${BASE_URL}/${batchId}/lines/${lineId}/entry-tickets`, {
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const getImportBatchTypeOptions = async (): Promise<
    ApiResponse<{ value: string; label: string }[]>
> => {
    const response = await apiApp.get(`${BASE_URL}/batch-types`);
    return response.data;
};

/* ------------------------------------------------------------------ *
 * Creating import batches from a supplier .csv / .xlsx file
 * ------------------------------------------------------------------ */

const FILE_IMPORT_URL = `${BASE_URL}/file-import`;

/** The rules the importer will apply, shown in the dialog before uploading. */
export const getImportBatchFileConfig = async (): Promise<ImportBatchFileConfig> => {
    const response = await apiApp.get(`${FILE_IMPORT_URL}/config`, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
    return response.data?.data;
};

export const updateImportBatchFileConfig = async (payload: {
    maxFileSizeMb?: number;
    maxRows?: number;
    serialSeparator?: string;
    storeOriginalFile?: boolean;
    allowPartialImport?: boolean;
    fieldAliases?: Record<string, string[]>;
}): Promise<ImportBatchFileConfig> => {
    const response = await apiApp.put(`${FILE_IMPORT_URL}/config`, payload, withAuthHeaders());
    return response.data?.data;
};

/** History of file-import runs, newest first. */
export const getImportBatchFileJobs = async (params?: {
    page?: number;
    size?: number;
    supplierId?: number;
}): Promise<ApiResponse<{ recordList: ImportBatchFileJob[] }>> => {
    const response = await apiApp.get(`${FILE_IMPORT_URL}/jobs`, {
        ...withAuthHeaders(),
        params,
        skipGlobalErrorToast: true,
    });
    return response.data;
};

/** Step 1: read the header layout and get a suggested column mapping. */
export const inspectImportBatchFile = async (
    file: File,
    supplierId?: number
): Promise<ApiResponse<ImportBatchFileInspectResult>> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiApp.post(`${FILE_IMPORT_URL}/inspect`, formData, {
        ...withAuthHeaders(),
        params: supplierId ? { supplierId } : undefined,
        skipGlobalErrorToast: true,
    });
    return response.data;
};

/** Step 2: resolve every row against the system. Writes nothing. */
export const previewImportBatchFile = async (
    file: File,
    payload: { supplierId: number; mapping: ImportBatchFileMapping }
): Promise<ApiResponse<ImportBatchFilePreviewResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    // The request part must be sent as JSON so Spring can bind it as a DTO.
    formData.append(
        'request',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    const response = await apiApp.post(`${FILE_IMPORT_URL}/preview`, formData, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
    return response.data;
};

/**
 * Step 3: create one batch per selected draw date, plus its tickets when the file
 * carries them. The file is re-sent so the backend re-resolves it rather than
 * trusting the preview held here.
 */
export const commitImportBatchFile = async (
    file: File,
    payload: ImportBatchFileCommitPayload
): Promise<ApiResponse<ImportBatchFileImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
        'request',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    const response = await apiApp.post(FILE_IMPORT_URL, formData, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
    return response.data;
};

/** Downloads a batch as CSV in the same schema the importer accepts. */
export const exportImportBatchFile = async (importBatchId: number | string): Promise<void> => {
    const response = await apiApp.get(`${FILE_IMPORT_URL}/export/${importBatchId}`, {
        ...withAuthHeaders(),
        responseType: 'blob',
        skipGlobalErrorToast: true,
    });

    const disposition = String(response.headers?.['content-disposition'] ?? '');
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : `phieu-nhap-${importBatchId}.csv`;

    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/** Column mappings remembered per supplier and file layout. */
export const getImportBatchFileMappingProfiles = async (
    supplierId?: number
): Promise<ImportBatchFileMappingProfile[]> => {
    const response = await apiApp.get(`${FILE_IMPORT_URL}/mapping-profiles`, {
        ...withAuthHeaders(),
        params: supplierId ? { supplierId } : undefined,
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const deleteImportBatchFileMappingProfile = async (id: number): Promise<void> => {
    await apiApp.delete(`${FILE_IMPORT_URL}/mapping-profiles/${id}`, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
};

export const saveImportBatchFileMappingProfile = async (payload: {
    supplierId: number;
    headerSignature: string;
    mapping: ImportBatchFileMapping;
}): Promise<void> => {
    await apiApp.post(`${FILE_IMPORT_URL}/mapping-profiles`, payload, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
};

/** Teaches the resolver a supplier's spelling of a station name. */
export const saveLotteryStationAlias = async (payload: {
    rawName: string;
    lotteryStationId: number;
}): Promise<void> => {
    await apiApp.post(`${FILE_IMPORT_URL}/station-aliases`, payload, {
        ...withAuthHeaders(),
        skipGlobalErrorToast: true,
    });
};
