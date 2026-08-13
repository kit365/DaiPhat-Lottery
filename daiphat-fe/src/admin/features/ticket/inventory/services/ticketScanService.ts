import { apiApp } from '../../../../../api';
import { ApiResponse } from '../../../../../types/api.type';
import {
    BatchImportScannedTicketsPayload,
    ScanBatchImportResult,
    TicketScanResult,
} from '../types/ticketScan.type';

const BASE_URL = `/lottery-tickets`;

/** Camera ticket-scan feature (DP-269): POST /lottery-tickets/scan — calls ticket-vision
 * through the backend, returns detected tickets without saving anything. */
export const scanTicketImage = async (
    importBatchLineId: number | string,
    file: File,
    options?: { skipGlobalErrorToast?: boolean }
): Promise<ApiResponse<TicketScanResult>> => {
    const formData = new FormData();
    formData.append('importBatchLineId', String(importBatchLineId));
    formData.append('file', file);

    const response = await apiApp.post(`${BASE_URL}/scan`, formData, {
        skipGlobalErrorToast: options?.skipGlobalErrorToast,
        // OCR on a multi-ticket photo can take several seconds (doc: 3-10s)
        // plus network time for the image itself — give it more room than
        // the instance default.
        timeout: 30_000,
    } as any);
    return response.data;
};

/** POST /lottery-tickets/batch-import — persists the user's confirmed/corrected
 * scanned tickets. Each ticket is imported independently server-side, so the
 * response reports a per-ticket Success/Duplicate/Failed outcome. */
export const batchImportScannedTickets = async (
    payload: BatchImportScannedTicketsPayload,
    options?: { skipGlobalErrorToast?: boolean }
): Promise<ApiResponse<ScanBatchImportResult>> => {
    const response = await apiApp.post(`${BASE_URL}/batch-import`, payload, {
        skipGlobalErrorToast: options?.skipGlobalErrorToast,
    } as any);
    return response.data;
};
