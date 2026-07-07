export const IMPORT_BATCH_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    RECEIVING: 'Đang nhập lô',
    CANCELLED: 'Đã hủy',
    IMPORTED: 'Đã nhập',
    IN_LEDGER: 'Đã vào sổ',
};

export const getImportBatchStatusLabel = (status?: string) => {
    if (!status) return '—';
    return IMPORT_BATCH_STATUS_LABELS[status] ?? status;
};

export const getImportBatchStatusChipColor = (
    status?: string
): 'default' | 'warning' | 'error' | 'success' => {
    if (status === 'DRAFT') return 'warning';
    if (status === 'RECEIVING') return 'info';
    if (status === 'CANCELLED') return 'error';
    if (status === 'IMPORTED') return 'success';
    return 'default';
};

/** Compact chip styling for table status columns */
export const importBatchStatusChipSx = {
    height: 24,
    maxWidth: 'fit-content',
    '& .MuiChip-label': {
        px: 1,
        py: 0,
        fontSize: '0.75rem',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
    },
} as const;

const IMPORT_DEADLINE_PASSED_REASON =
    'Automatically cancelled because the import deadline has passed.';

const DRAW_DATE_EXPIRED_REASON =
    'Automatically cancelled because the Draw Date has expired while the batch was still in DRAFT status.';

/** Human-readable cancellation reason shown below the detail page title */
export const formatImportBatchCancelReason = (cancelReason?: string) => {
    if (!cancelReason?.trim()) return undefined;
    if (cancelReason === IMPORT_DEADLINE_PASSED_REASON) {
        return 'Tự động hủy vì đã quá giờ chốt nhập lô.';
    }
    if (cancelReason === DRAW_DATE_EXPIRED_REASON) {
        return 'Tự động hủy vì ngày quay đã qua trong khi phiếu vẫn ở trạng thái nháp.';
    }
    return cancelReason;
};

/** User-facing alert when a batch is cancelled and ticket import is blocked */
export const getImportBatchCancelledAlertMessage = (cancelReason?: string) => {
    if (cancelReason === IMPORT_DEADLINE_PASSED_REASON) {
        return 'Phiếu nhập lô đã bị hủy vì đã quá giờ chốt nhập lô (sau 15:00). Không thể nhập thêm vé vào phiếu này.';
    }
    if (cancelReason === DRAW_DATE_EXPIRED_REASON) {
        return 'Phiếu nhập lô đã bị hủy vì ngày quay đã qua trong khi phiếu vẫn ở trạng thái nháp. Không thể nhập thêm vé vào phiếu này.';
    }
    return 'Phiếu nhập lô đã bị hủy. Không thể nhập thêm vé vào phiếu này.';
};

export const IMPORT_BATCH_LINE_STATUS_LABELS: Record<string, string> = {
    OPEN: 'Nháp',
    IMPORTING: 'Đang nhập lô',
    IMPORTED: 'Đã nhập đủ',
};

export const getImportBatchLineStatusLabel = (status?: string) => {
    if (!status) return '—';
    return IMPORT_BATCH_LINE_STATUS_LABELS[status] ?? status;
};

export const IMPORT_BATCH_TYPE_LABELS: Record<string, string> = {
    NEW: 'Nhập mới',
    SUPPLEMENTARY: 'Nhập bổ sung',
    LATE_IMPORT: 'Nhập trễ',
    ADJUSTMENT: 'Nhập vé điều chỉnh',
    ADDITIONAL: 'Nhập vé điều chỉnh',
};

export const getBatchTypeLabel = (type?: string) => {
    if (!type) return '—';
    return IMPORT_BATCH_TYPE_LABELS[type] ?? type;
};

export const IMPORT_MODE_OPTIONS = [
    { value: 'IN_DAY', label: 'Nhập vé trong ngày' },
    { value: 'POST_DRAW_SUPPLEMENT', label: 'Nhập vé bổ sung' },
] as const;

export type ImportBatchImportMode = (typeof IMPORT_MODE_OPTIONS)[number]['value'];

export const getImportModeLabel = (mode?: string) =>
    IMPORT_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode ?? '—';
