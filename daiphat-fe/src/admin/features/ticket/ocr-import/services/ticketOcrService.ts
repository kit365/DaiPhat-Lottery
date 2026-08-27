import { apiApp } from '../../../../../api';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import type {
    BatchImportScannedTicketsPayload,
    LotteryScanLog,
    OcrConfirmImportPayload,
    OcrConfirmImportResponse,
    OcrScanResult,
    ScanBatchImportResponse,
    TicketScanResponse,
} from '../types/ticketOcr.type';

const BASE_URL = '/lottery-tickets';

export const scanTicketImage = async (
    file: File,
    importBatchLineId?: number | null
): Promise<ApiResponse<TicketScanResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/scan`, formData, {
        params:
            importBatchLineId != null && Number.isFinite(importBatchLineId)
                ? { importBatchLineId }
                : undefined,
        timeout: 120_000,
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const batchImportScannedTickets = async (
    payload: BatchImportScannedTicketsPayload
): Promise<ApiResponse<ScanBatchImportResponse>> => {
    const response = await apiApp.post(`${BASE_URL}/batch-import`, payload);
    return response.data;
};

export const confirmOcrImport = async (
    payload: OcrConfirmImportPayload
): Promise<ApiResponse<OcrConfirmImportResponse>> => {
    const response = await apiApp.post(`${BASE_URL}/ocr-confirm-import`, payload, {
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const listOcrScanResults = async (params: {
    scanId?: string;
    importBatchLineId?: number;
}): Promise<OcrScanResult[]> => {
    const response = await apiApp.get(`${BASE_URL}/ocr-scan-results`, {
        params,
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export type OcrFieldCorrectionPayload = {
    fieldName:
        | 'stationName'
        | 'numbers'
        | 'serialNumber'
        | 'drawDate'
        | 'ticketType'
        | 'batchCode'
        | 'price';
    correctedValue: string | null;
};

export const correctOcrScanResultFields = async (
    ocrScanResultId: number,
    fields: OcrFieldCorrectionPayload[]
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(
        `${BASE_URL}/ocr-scan-results/${ocrScanResultId}/fields`,
        { fields },
        { skipGlobalErrorToast: true }
    );
    return response.data;
};

export const getLotteryScanLogs = async (params?: {
    page?: number;
    size?: number;
    ocrScanResultId?: number;
    eventType?: string;
    scannedAtFrom?: string;
    scannedAtTo?: string;
    sortBy?: string;
    direction?: string;
}): Promise<ApiResponse<PageResponse<LotteryScanLog>>> => {
    const response = await apiApp.get(`${BASE_URL}/scan-logs`, {
        params: {
            page: params?.page ?? 1,
            size: params?.size ?? 20,
            ...params,
        },
        skipGlobalErrorToast: true,
    });
    return response.data;
};
