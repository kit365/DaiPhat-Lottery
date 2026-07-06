import type { ImportBatchType } from '../../../api/importBatch.api';
import { getBatchTypeLabel } from './batchTypeLabels';
import dayjs from 'dayjs';

/** Header voucher pattern: PN-{yyyyMMdd}-{seq} */
export const IMPORT_BATCH_HEADER_CODE_PATTERN = /^PN-(\d{8})-(\d{4})$/;

/** Line pattern: LO-{yyyyMMdd}-{STATION}-{TYPE}-{seq} */
export const IMPORT_BATCH_LINE_CODE_PATTERN =
    /^LO-(\d{8})-([A-Z0-9]+)-(NEW|SUPP|LATE|ADJ)-(\d{4})$/;

/** @deprecated use {@link IMPORT_BATCH_LINE_CODE_PATTERN} */
export const IMPORT_BATCH_CODE_PATTERN = IMPORT_BATCH_LINE_CODE_PATTERN;

const TYPE_SEGMENT_LABELS: Record<string, ImportBatchType> = {
    NEW: 'NEW',
    SUPP: 'SUPPLEMENTARY',
    LATE: 'LATE_IMPORT',
    ADJ: 'ADJUSTMENT',
};

const formatDrawDateFromCode = (yyyymmdd: string) =>
    `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;

/** Readable label for import batch header codes (phiếu nhập). */
export const formatImportBatchHeaderCode = (batchCode?: string, fallbackId?: number) => {
    if (!batchCode?.trim()) {
        return fallbackId != null ? `#${fallbackId}` : '—';
    }
    const trimmed = batchCode.trim();
    const match = trimmed.match(IMPORT_BATCH_HEADER_CODE_PATTERN);
    if (!match) {
        return trimmed;
    }
    const [, drawDatePart, sequence] = match;
    return `PN-${sequence} · ${formatDrawDateFromCode(drawDatePart)}`;
};

export const displayImportBatchHeaderCodeRaw = (batchCode?: string, fallbackId?: number) =>
    batchCode?.trim() || (fallbackId != null ? `#${fallbackId}` : '—');

export type ImportBatchLabelSource = {
    id: number;
    batchCode?: string;
    drawDate?: string;
    supplierName?: string;
    lineCount?: number;
    lines?: unknown[];
};

const resolveImportBatchLineCount = (batch: ImportBatchLabelSource) =>
    batch.lineCount ?? batch.lines?.length ?? 0;

/**
 * Compact label for dropdowns and selection summaries.
 * Draw date appears once — embedded in PN header formatting, or appended for #id fallback.
 */
export const formatImportBatchSelectLabel = (batch: ImportBatchLabelSource) => {
    const headerLabel = formatImportBatchHeaderCode(batch.batchCode, batch.id);
    const headerHasDrawDate = !!batch.batchCode?.trim().match(IMPORT_BATCH_HEADER_CODE_PATTERN);
    const parts = [headerLabel];

    if (!headerHasDrawDate && batch.drawDate) {
        parts.push(dayjs(batch.drawDate).format('DD/MM/YYYY'));
    }

    parts.push(batch.supplierName || 'N/A', `${resolveImportBatchLineCount(batch)} đài`);
    return parts.join(' · ');
};

/** @deprecated use {@link formatImportBatchSelectLabel} */
export const formatImportBatchOptionLabel = formatImportBatchSelectLabel;

/** Display helper for line-level batch codes. */
export const formatImportBatchLineCode = (batchCode?: string) => {
    if (!batchCode?.trim()) {
        return '—';
    }
    const trimmed = batchCode.trim();
    const match = trimmed.match(IMPORT_BATCH_LINE_CODE_PATTERN);
    if (!match) {
        return trimmed;
    }
    const [, drawDatePart, stationCode, typeSegment, sequence] = match;
    const batchType = TYPE_SEGMENT_LABELS[typeSegment];
    const typeLabel = batchType ? getBatchTypeLabel(batchType) : typeSegment;
    return `${sequence} · ${stationCode} · ${typeLabel} · ${formatDrawDateFromCode(drawDatePart)}`;
};

/** @deprecated use {@link formatImportBatchLineCode} for lines or {@link formatImportBatchHeaderCode} for headers */
export const formatImportBatchCode = formatImportBatchLineCode;

export const displayImportBatchLineCodeRaw = (batchCode?: string) =>
    batchCode?.trim() || '—';

/** @deprecated use {@link displayImportBatchLineCodeRaw} */
export const displayImportBatchCodeRaw = displayImportBatchLineCodeRaw;

export const importBatchCodeMonospaceSx = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.8125rem',
    letterSpacing: '0.01em',
} as const;
