import type { ScannedTicket } from './ticketOcr.type';

export type OcrSessionStatus = 'WAITING_FOR_MOBILE' | 'CONNECTED' | 'CLOSED' | 'EXPIRED';

export interface OcrSessionImage {
    id: string;
    imageUrl: string;
    fileName: string;
    contentType: string;
    uploadedAt: string;
}

export interface OcrSessionResponse {
    sessionCode: string;
    status: OcrSessionStatus;
    importBatchId?: number | null;
    importBatchLineId?: number | null;
    connectedStaffName?: string | null;
    connectedDevice?: string | null;
    scannedTicketCount: number;
    createdAt: string;
    expiresAt: string;
    qrToken: string;
    images?: OcrSessionImage[];
}

export interface OcrSessionSocketEvent {
    eventType: 'SESSION_CONNECTED' | 'IMAGE_UPLOADED' | 'TICKET_SCANNED' | 'SESSION_CLOSED' | 'SESSION_EXPIRED';
    image?: OcrSessionImage;
    sessionCode: string;
    staffName?: string | null;
    deviceName?: string | null;
    scanId?: string | null;
    tickets?: ScannedTicket[];
    totalInSession?: number;
    message?: string;
    timestamp?: string;
}
