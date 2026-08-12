import { ScanImportOutcome, ScannedTicketStatus } from '../types/ticketScan.type';

/** Overlay/chip color per scanned-ticket status (doc: green/yellow/red). */
export const SCAN_STATUS_META: Record<
    ScannedTicketStatus,
    { label: string; color: 'success' | 'warning' | 'error'; hex: string }
> = {
    COMPLETE: { label: 'Đầy đủ', color: 'success', hex: '#2e7d32' },
    NEEDS_REVIEW: { label: 'Cần kiểm tra', color: 'warning', hex: '#ed6c02' },
    INCOMPLETE: { label: 'Thiếu / Lỗi', color: 'error', hex: '#d32f2f' },
};

export const SCAN_IMPORT_OUTCOME_META: Record<
    ScanImportOutcome,
    { label: string; color: 'success' | 'warning' | 'error' }
> = {
    SUCCESS: { label: 'Thành công', color: 'success' },
    DUPLICATE: { label: 'Trùng lặp', color: 'warning' },
    FAILED: { label: 'Thất bại', color: 'error' },
};

export const FIELD_LABELS: Record<string, string> = {
    stationName: 'Đài xổ số',
    serialNumber: 'Số sê-ri',
    numbers: 'Dãy số',
    drawDate: 'Ngày quay',
};
