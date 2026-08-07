/** Pattern for Return Batch header code: PT-{yyyyMMdd}-{seq} */
export const RETURN_BATCH_HEADER_CODE_PATTERN = /^PT-(\d{8})-(\d{4})$/;

/** Readable label for return batch header codes (phiếu trả vé). */
export const formatReturnBatchHeaderCode = (batchCode?: string | null, fallbackId?: number) => {
    if (!batchCode?.trim()) {
        return fallbackId != null ? `#${fallbackId}` : '—';
    }
    return batchCode.trim();
};

export const displayReturnBatchHeaderCodeRaw = (batchCode?: string | null, fallbackId?: number) =>
    batchCode?.trim() || (fallbackId != null ? `#${fallbackId}` : '—');

export const returnBatchCodeMonospaceSx = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.8125rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
} as const;
