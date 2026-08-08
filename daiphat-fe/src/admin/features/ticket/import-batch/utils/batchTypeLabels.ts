export const IMPORT_BATCH_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    RECEIVING: 'Đang nhập lô',
    PARTIALLY_IMPORTED: 'Nhập một phần',
    CANCELLED: 'Đã hủy',
    IMPORTED: 'Đã nhập',
    IN_LEDGER: 'Đã vào sổ',
};

export const getImportBatchStatusLabel = (status?: string) => {
    if (!status) return '—';
    return IMPORT_BATCH_STATUS_LABELS[status] ?? status;
};

/** Shorter Vietnamese labels for table status badges; full label elsewhere via getImportBatchStatusLabel. */
export const IMPORT_BATCH_STATUS_CHIP_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    RECEIVING: 'Đang nhập lô',
    PARTIALLY_IMPORTED: 'Một phần',
    CANCELLED: 'Đã hủy',
    IMPORTED: 'Đã nhập',
    IN_LEDGER: 'Đã vào sổ',
};

export const getImportBatchStatusChipLabel = (status?: string) => {
    if (!status) return '—';
    return IMPORT_BATCH_STATUS_CHIP_LABELS[status] ?? getImportBatchStatusLabel(status);
};

export const getImportBatchStatusChipColor = (
    status?: string
): 'default' | 'warning' | 'error' | 'success' | 'info' => {
    if (status === 'DRAFT') return 'warning';
    if (status === 'RECEIVING') return 'info';
    if (status === 'PARTIALLY_IMPORTED') return 'warning';
    if (status === 'CANCELLED') return 'error';
    if (status === 'IMPORTED') return 'success';
    if (status === 'IN_LEDGER') return 'success';
    return 'default';
};

/** Global CSS: `.admin-status-badge` + modifier */
export const getImportBatchStatusBadgeClass = (status?: string) => {
    switch (status) {
        case 'DRAFT':
            return 'admin-status-badge--draft';
        case 'RECEIVING':
            return 'admin-status-badge--active';
        case 'PARTIALLY_IMPORTED':
            return 'admin-status-badge--pending';
        case 'CANCELLED':
            return 'admin-status-badge--inactive';
        case 'IMPORTED':
        case 'IN_LEDGER':
            return 'admin-status-badge--success';
        default:
            return 'admin-status-badge--draft';
    }
};

export const getImportModeBadgeClass = (mode?: string) => {
    if (mode === 'IN_DAY' || mode === 'SAME_DAY') return 'admin-status-badge--active';
    if (mode === 'POST_DRAW_SUPPLEMENT') return 'admin-status-badge--pending';
    return 'admin-status-badge--draft';
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

const ALL_LINES_CANCELLED_REASON =
    'The Import Batch has been cancelled because all Lottery Station import batches are no longer valid.';

const LINE_DRAW_DATE_EXPIRED_SUFFIX =
    'import has been cancelled because the Draw Date has expired before ticket import was completed.';

const LINE_IMPORT_DEADLINE_PASSED_SUFFIX =
    'import has been cancelled because the same-day import deadline has passed.';

/** Human-readable cancellation reason shown below the detail page title */
export const formatImportBatchCancelReason = (cancelReason?: string) => {
    if (!cancelReason?.trim()) return undefined;
    if (cancelReason === IMPORT_DEADLINE_PASSED_REASON) {
        return 'Tự động hủy vì đã quá giờ chốt nhập lô.';
    }
    if (cancelReason === DRAW_DATE_EXPIRED_REASON) {
        return 'Tự động hủy vì ngày quay đã qua trong khi phiếu vẫn ở trạng thái nháp.';
    }
    if (cancelReason === ALL_LINES_CANCELLED_REASON) {
        return 'Phiếu nhập lô đã bị hủy vì tất cả các dòng nhập lô theo nhà đài đều không còn hiệu lực.';
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
    if (cancelReason === ALL_LINES_CANCELLED_REASON) {
        return 'Phiếu nhập lô đã bị hủy vì tất cả các dòng nhập lô theo nhà đài đều không còn hiệu lực. Không thể nhập thêm vé vào phiếu này.';
    }
    return 'Phiếu nhập lô đã bị hủy. Không thể nhập thêm vé vào phiếu này.';
};

export const formatImportBatchLineCancelReason = (cancelReason?: string) => {
    if (!cancelReason?.trim()) return undefined;
    if (cancelReason.includes(LINE_DRAW_DATE_EXPIRED_SUFFIX)) {
        return cancelReason.replace(
            LINE_DRAW_DATE_EXPIRED_SUFFIX,
            'đã bị hủy vì ngày quay đã qua trước khi hoàn tất nhập vé.'
        );
    }
    if (cancelReason.includes(LINE_IMPORT_DEADLINE_PASSED_SUFFIX)) {
        return cancelReason.replace(
            LINE_IMPORT_DEADLINE_PASSED_SUFFIX,
            'đã bị hủy vì đã quá giờ chốt nhập lô trong ngày.'
        );
    }
    return cancelReason;
};

export const getImportBatchLineCancelledAlertMessage = (cancelReason?: string) => {
    const formatted = formatImportBatchLineCancelReason(cancelReason);
    if (formatted) {
        return `${formatted} Không thể nhập thêm vé cho nhà đài này.`;
    }
    return 'Dòng nhập lô cho nhà đài này đã bị hủy. Không thể nhập thêm vé.';
};

export const IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE =
    'Đang tạm dừng nhập vé. Vui lòng tiếp tục nhập (Resume) trên phiếu nhập lô để thêm vé.';

export const IMPORT_BATCH_LINE_STATUS_LABELS: Record<string, string> = {
    OPEN: 'Nháp',
    IMPORTING: 'Đang nhập',
    PAUSED: 'Tạm dừng nhập',
    IMPORTED: 'Đã đủ',
    CANCELLED: 'Đã hủy',
};

export const getImportBatchLineStatusLabel = (status?: string) => {
    if (!status) return '—';
    return IMPORT_BATCH_LINE_STATUS_LABELS[status] ?? status;
};

export const getImportBatchLineStatusChipColor = (
    status?: string
): 'default' | 'warning' | 'error' | 'success' | 'info' => {
    if (status === 'IMPORTED') return 'success';
    if (status === 'IMPORTING') return 'info';
    if (status === 'PAUSED') return 'warning';
    if (status === 'CANCELLED') return 'error';
    if (status === 'OPEN') return 'warning';
    return 'default';
};

/** Global CSS: `.admin-status-badge` + modifier */
export const getImportBatchLineStatusBadgeClass = (status?: string) => {
    switch (status) {
        case 'IMPORTED':
            return 'admin-status-badge--success';
        case 'IMPORTING':
            return 'admin-status-badge--active';
        case 'PAUSED':
            return 'admin-status-badge--pending';
        case 'CANCELLED':
            return 'admin-status-badge--inactive';
        case 'OPEN':
            return 'admin-status-badge--pending';
        default:
            return 'admin-status-badge--draft';
    }
};

export const IMPORT_BATCH_TYPE_LABELS: Record<string, string> = {
    NEW: 'Nhập mới',
    SUPPLEMENTARY: 'Nhập bổ sung',
    ADJUSTMENT: 'Nhập vé điều chỉnh',
    ADDITIONAL: 'Nhập vé điều chỉnh',
};

export const getBatchTypeLabel = (type?: string) => {
    if (!type) return '—';
    return IMPORT_BATCH_TYPE_LABELS[type] ?? type;
};

export const getBatchTypeColor = (
    type?: string
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (type === 'NEW') return 'primary';
    if (type === 'SUPPLEMENTARY') return 'secondary';
    if (type === 'ADJUSTMENT' || type === 'ADDITIONAL') return 'info';
    return 'default';
};

/** Global CSS: `.admin-status-badge` + modifier */
export const getBatchTypeBadgeClass = (type?: string) => {
    switch (type) {
        case 'NEW':
            return 'admin-status-badge--success';
        case 'SUPPLEMENTARY':
            return 'admin-status-badge--pending';
        case 'ADJUSTMENT':
        case 'ADDITIONAL':
            return 'admin-status-badge--active';
        default:
            return 'admin-status-badge--draft';
    }
};

export const IMPORT_MODE_LABELS: Record<string, string> = {
    IN_DAY: 'Nhập vé trong ngày',
    SAME_DAY: 'Nhập vé trong ngày',
    POST_DRAW_SUPPLEMENT: 'Nhập vé bổ sung sau quay số',
};

export const IMPORT_MODE_OPTIONS = [
    { value: 'IN_DAY', label: IMPORT_MODE_LABELS.IN_DAY },
    { value: 'POST_DRAW_SUPPLEMENT', label: IMPORT_MODE_LABELS.POST_DRAW_SUPPLEMENT },
] as const;

export type ImportBatchImportMode = (typeof IMPORT_MODE_OPTIONS)[number]['value'];

export const getImportModeLabel = (mode?: string) => {
    if (!mode) return '—';
    return IMPORT_MODE_LABELS[mode] ?? mode;
};

/** Shorter Vietnamese labels for table chips; full label available via tooltip. */
export const IMPORT_MODE_CHIP_LABELS: Record<string, string> = {
    IN_DAY: 'Trong ngày',
    SAME_DAY: 'Trong ngày',
    POST_DRAW_SUPPLEMENT: 'Bổ sung sau quay',
};

export const getImportModeChipLabel = (mode?: string) => {
    if (!mode) return '—';
    return IMPORT_MODE_CHIP_LABELS[mode] ?? getImportModeLabel(mode);
};

export const getImportModeChipColor = (
    mode?: string
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (mode === 'IN_DAY' || mode === 'SAME_DAY') return 'info';
    if (mode === 'POST_DRAW_SUPPLEMENT') return 'secondary';
    return 'default';
};

/** Full labels for incomplete-batch notification badges. */
export const IMPORT_MODE_NOTIFICATION_LABELS: Record<string, string> = {
    IN_DAY: 'Nhập vé trong ngày',
    SAME_DAY: 'Nhập vé trong ngày',
    POST_DRAW_SUPPLEMENT: 'Nhập vé bổ sung',
};

export const getImportModeNotificationLabel = (mode?: string) => {
    if (!mode) return '—';
    return IMPORT_MODE_NOTIFICATION_LABELS[mode] ?? getImportModeLabel(mode);
};
