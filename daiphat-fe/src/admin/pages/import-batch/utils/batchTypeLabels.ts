export const IMPORT_BATCH_TYPE_LABELS: Record<string, string> = {
    NEW: 'Nhập mới',
    SUPPLEMENTARY: 'Nhập bổ sung',
    LATE_IMPORT: 'Nhập trễ',
    ADJUSTMENT: 'Nhập vé bổ sung',
    ADDITIONAL: 'Nhập vé bổ sung',
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
