import type { ImportBatchLine, ImportBatchType } from '../types/importBatch.type';
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
export const formatImportBatchLineCode = (batchCode?: any) => {
    const str = typeof batchCode === 'string' ? batchCode : (batchCode?.batchCode || '');
    if (!str?.trim()) {
        return '—';
    }
    const trimmed = str.trim();
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

export const displayImportBatchLineCodeRaw = (batchCode?: any) => {
    if (typeof batchCode === 'string') return batchCode.trim() || '—';
    if (batchCode && typeof batchCode === 'object') {
        const code = batchCode.batchCode || batchCode.code;
        if (typeof code === 'string') return code.trim() || '—';
    }
    return '—';
};

/** Single line: stored batch code + stored batch type enum. */
export const formatImportBatchLineCodeAndTypeStored = (line: Pick<ImportBatchLine, 'batchCode' | 'batchType'>) => {
    const code = displayImportBatchLineCodeRaw(line.batchCode);
    const type = line.batchType || '—';
    return `${code} / ${type}`;
};

/** Compact table display: station · type segment · sequence (draw date omitted). */
export const formatImportBatchLineCodeShort = (line: Pick<ImportBatchLine, 'batchCode' | 'batchType'>) => {
    const trimmed = line.batchCode?.trim();
    const match = trimmed?.match(IMPORT_BATCH_LINE_CODE_PATTERN);
    if (match) {
        const [, , stationCode, typeSegment, sequence] = match;
        return `${stationCode}·${typeSegment}·${sequence}`;
    }
    if (trimmed) {
        const parts = trimmed.split('-');
        const tail = parts.length >= 2 ? parts.slice(-2).join('·') : trimmed;
        const type = line.batchType ?? '—';
        return `${tail}·${type}`;
    }
    return line.batchType ?? '—';
};

/** Concise comma-separated summary for list table cells. */
export const formatImportBatchLinesSummaryShort = (lines: ImportBatchLine[] = []) =>
    lines.map(formatImportBatchLineCodeShort).join(', ');

/** Compact comma-separated summary for table cells. */
export const formatImportBatchLinesSummaryCompact = (lines: ImportBatchLine[] = []) =>
    formatImportBatchLinesSummaryShort(lines);

/** Multiline tooltip content showing every line's stored code and type. */
export const formatImportBatchLinesSummaryTooltip = (lines: ImportBatchLine[] = []) =>
    lines.map(formatImportBatchLineCodeAndTypeStored).join('\n');

/** @deprecated use {@link displayImportBatchLineCodeRaw} */
export const displayImportBatchCodeRaw = displayImportBatchLineCodeRaw;

export const importBatchCodeMonospaceSx = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.8125rem',
    letterSpacing: '0.01em',
} as const;
