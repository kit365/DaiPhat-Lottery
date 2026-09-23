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
    options?: {
        importBatchLineId?: number | null;
        importBatchId?: number | null;
    }
): Promise<ApiResponse<TicketScanResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    const params: Record<string, number> = {};
    if (options?.importBatchLineId != null && Number.isFinite(options.importBatchLineId)) {
        params.importBatchLineId = options.importBatchLineId;
    }
    if (options?.importBatchId != null && Number.isFinite(options.importBatchId)) {
        params.importBatchId = options.importBatchId;
    }
    const startedAt = performance.now();
    const response = await apiApp.post(`${BASE_URL}/scan`, formData, {
        params: Object.keys(params).length > 0 ? params : undefined,
        // Align with Next proxy OCR timeout (210s); BE ticket-vision read is 180s.
        timeout: 210_000,
        skipGlobalErrorToast: true,
    });
    const elapsedMs = Math.round(performance.now() - startedAt);
    const ticketCount = response.data?.data?.ticketCount ?? response.data?.data?.tickets?.length ?? 0;
    console.info(
        `[OCR timing] upload→response ${elapsedMs}ms file=${file.name} bytes=${file.size} tickets=${ticketCount}`
    );
    return response.data;
};

export type OcrServiceReady = {
    ready: boolean;
    message?: string | null;
};

/** Probe ticket-vision via BE — used when opening the OCR import modal. */
export const getOcrServiceReady = async (): Promise<OcrServiceReady> => {
    const response = await apiApp.get(`${BASE_URL}/ocr-service-ready`, {
        skipGlobalErrorToast: true,
        timeout: 8_000,
    });
    return response.data?.data ?? { ready: false, message: response.data?.message };
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
