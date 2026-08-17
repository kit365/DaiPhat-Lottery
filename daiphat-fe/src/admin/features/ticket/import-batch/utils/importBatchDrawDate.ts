import dayjs, { type Dayjs } from 'dayjs';
import type { ImportBatchEligibleStation, ImportBatchType } from '../types/importBatch.type';
import type { ImportBatchImportMode } from './batchTypeLabels';

/** Draw date is before today — batch type is always additional import. */
export const isPastDrawDate = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isBefore(dayjs(), 'day');

export const isDrawDateToday = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isSame(dayjs(), 'day');

export const isTomorrowDrawDate = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isSame(dayjs().add(1, 'day'), 'day');

export const isFutureBeyondTomorrow = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isAfter(dayjs().add(1, 'day'), 'day');

const parseClockTime = (time?: string): Dayjs | null => {
    if (!time?.trim()) {
        return null;
    }
    const [hourPart, minutePart] = time.trim().split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return null;
    }
    return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
};

/** Instant the supplier starts accepting tickets for a draw date. Morning hours open the previous day. */
export const resolveSupplierImportAllowFromAt = (
    importAllowFrom?: string,
    drawDate?: string
): Dayjs | null => {
    const allowFrom = parseClockTime(importAllowFrom);
    if (!allowFrom || !drawDate) {
        return null;
    }
    const open = dayjs(drawDate)
        .hour(allowFrom.hour())
        .minute(allowFrom.minute())
        .second(0)
        .millisecond(0);
    if (!open.isValid()) {
        return null;
    }
    return allowFrom.hour() < 12 ? open.subtract(1, 'day') : open;
};

/** True when current clock is still before the supplier's import-allow-from time for this draw. */
export const isBeforeSupplierImportAllowFrom = (
    importAllowFrom?: string,
    drawDate?: string,
    now: Dayjs = dayjs()
) => {
    const openAt = resolveSupplierImportAllowFromAt(importAllowFrom, drawDate);
    if (!openAt) {
        return false;
    }
    return now.isBefore(openAt);
};

/** All eligible stations resolve to post-draw additional import. */
export const areAllStationsAdditionalImport = (stations: ImportBatchEligibleStation[] = []) =>
    stations.length > 0 && stations.every((station) => station.resolvedBatchType === 'ADJUSTMENT');

export type ImportModeLockState =
    | { locked: false }
    | { locked: true; mode: ImportBatchImportMode; reason: string };

/** Derive import mode from draw date (today / tomorrow → IN_DAY). */
export const resolveImportModeLock = (drawDate?: string): ImportModeLockState => {
    if (isTomorrowDrawDate(drawDate) || isDrawDateToday(drawDate)) {
        return {
            locked: true,
            mode: 'IN_DAY',
            reason: '',
        };
    }

    return { locked: false };
};

/** Resolved batch type for display — prefer API classification from eligible stations. */
export const resolveDisplayBatchType = (
    resolvedBatchType?: ImportBatchType,
    stationResolvedBatchType?: ImportBatchType
): ImportBatchType | undefined => resolvedBatchType ?? stationResolvedBatchType;

export const isAdditionalBatchType = (batchType?: ImportBatchType) => batchType === 'ADJUSTMENT';

/** Post-draw supplementary batches are exempt from scheduler auto-cancellation. */
export const isPostDrawSupplementImportMode = (importMode?: ImportBatchImportMode) =>
    importMode === 'POST_DRAW_SUPPLEMENT';

/** ADJUSTMENT lines represent post-draw supplementary compensation imports. */
export const isLineExemptFromAutoCancellation = (batchType?: ImportBatchType) =>
    isAdditionalBatchType(batchType);

export const isBatchExemptFromAutoCancellation = (importMode?: ImportBatchImportMode) =>
    isPostDrawSupplementImportMode(importMode);

export const getDrawDateInputBounds = () => ({
    min: dayjs().format('YYYY-MM-DD'),
    max: dayjs().add(1, 'day').format('YYYY-MM-DD'),
});

export const isDrawDateWithinAllowedRange = (drawDate?: string) => {
    if (!drawDate) {
        return false;
    }
    return isDrawDateToday(drawDate) || isTomorrowDrawDate(drawDate);
};

const DEFAULT_RETURN_CUTOFF_TIME = '14:30';

/**
 * Fallback for system_config RETURN_BUFFER_TIME while the policy is still
 * loading, or when it is missing. Named so the same figure is not spelled out
 * separately in every caller that has to guess.
 */
const DEFAULT_RETURN_BUFFER_MINUTES = 45;

export { DEFAULT_RETURN_CUTOFF_TIME, DEFAULT_RETURN_BUFFER_MINUTES };

/** Clock time when ticket intake closes (return cut-off minus buffer). */
export const resolveInspectionStartTime = (
    returnCutOffTime?: string,
    returnBufferMinutes = 45,
    now: Dayjs = dayjs()
): Dayjs | null => {
    const cutoff = parseClockTime(returnCutOffTime);
    if (!cutoff || returnBufferMinutes <= 0) {
        return null;
    }
    const todayCutoff = now
        .hour(cutoff.hour())
        .minute(cutoff.minute())
        .second(0)
        .millisecond(0);
    return todayCutoff.subtract(returnBufferMinutes, 'minute');
};

/**
 * Whether new tickets may no longer be imported for today's draw date.
 * Mirrors backend SupplierTicketIntakeWindowPolicy.isIntakeClosed.
 */
export const isImportIntakeClosed = (
    returnCutOffTime?: string,
    drawDate?: string,
    returnBufferMinutes = 45,
    now: Dayjs = dayjs()
) => {
    if (!drawDate || !isDrawDateToday(drawDate)) {
        return false;
    }
    const inspectionStart = resolveInspectionStartTime(returnCutOffTime, returnBufferMinutes, now);
    if (!inspectionStart) {
        return false;
    }
    return !now.isBefore(inspectionStart);
};

export const buildImportIntakeClosedMessage = ({
    supplierName,
    returnCutOffTime,
    returnBufferMinutes = 45,
    drawDate,
    now = dayjs(),
}: {
    supplierName?: string | null;
    returnCutOffTime?: string | null;
    returnBufferMinutes?: number;
    drawDate?: string | null;
    now?: Dayjs;
}) => {
    const inspectionStart = resolveInspectionStartTime(
        returnCutOffTime ?? undefined,
        returnBufferMinutes,
        now
    );
    const inspectionLabel = inspectionStart?.format('HH:mm') ?? '—';
    const cutoffLabel = (returnCutOffTime ?? DEFAULT_RETURN_CUTOFF_TIME).trim().slice(0, 5);
    const drawLabel = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';
    return `Từ ${inspectionLabel} không được nhập lô cho kỳ quay ${drawLabel} (NCC: ${supplierName || '—'}). Giờ chốt trả vé: ${cutoffLabel}.`;
};

export const buildImportIntakeBlockedTooltip = ({
    inspectionStartLabel,
    returnCutOffLabel,
    drawDate,
}: {
    inspectionStartLabel?: string | null;
    returnCutOffLabel?: string | null;
    drawDate?: string | null;
}) => {
    const drawLabel = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : 'hôm nay';
    const fromTime = inspectionStartLabel ?? '—';
    const cutoffTime = returnCutOffLabel ?? '—';
    return `Đã quá giờ nhập lô. Từ ${fromTime} không được nhập vé cho kỳ quay ${drawLabel}. Giờ chốt trả vé: ${cutoffTime}.`;
};

/** True when current clock is at or after the supplier's return cut-off time. */
export const isReturnCutOffPassed = (returnCutOffTime?: string, now: Dayjs = dayjs()) => {
    const cutoff = parseClockTime(returnCutOffTime);
    if (!cutoff) {
        return false;
    }
    const todayCutoff = now
        .hour(cutoff.hour())
        .minute(cutoff.minute())
        .second(0)
        .millisecond(0);
    return now.isSame(todayCutoff) || now.isAfter(todayCutoff);
};

/** True when current clock is within the return-buffer window before cut-off. */
export const isInReturnCutOffWarningWindow = (
    returnCutOffTime?: string,
    returnBufferMinutes = 45,
    now: Dayjs = dayjs()
) => {
    const cutoff = parseClockTime(returnCutOffTime);
    if (!cutoff || returnBufferMinutes <= 0) {
        return false;
    }
    const todayCutoff = now
        .hour(cutoff.hour())
        .minute(cutoff.minute())
        .second(0)
        .millisecond(0);
    const warningStart = todayCutoff.subtract(returnBufferMinutes, 'minute');
    return (
        (now.isSame(warningStart) || now.isAfter(warningStart)) && now.isBefore(todayCutoff)
    );
};

/**
 * True when ticket intake is closed for today's draw — same rule as BE
 * ({@code returnCutOffTime − RETURN_BUFFER}).
 */
export const isTicketIntakeClosed = (
    returnCutOffTime?: string,
    returnBufferMinutes = 45,
    now: Dayjs = dayjs()
) => {
    const cutoff = parseClockTime(returnCutOffTime);
    if (!cutoff) {
        return false;
    }
    const todayCutoff = now
        .hour(cutoff.hour())
        .minute(cutoff.minute())
        .second(0)
        .millisecond(0);
    const inspectionStart = todayCutoff.subtract(Math.max(0, returnBufferMinutes), 'minute');
    return now.isSame(inspectionStart) || now.isAfter(inspectionStart);
};

/**
 * Resolves the default draw date for a new import batch:
 * If the cutoff time for today has passed, defaults to tomorrow.
 * Otherwise, defaults to today.
 */
export const getDefaultInitialDrawDate = (
    returnCutOffTime?: string,
    returnBufferMinutes = 45,
    now: Dayjs = dayjs()
): string => {
    const cutoff = returnCutOffTime?.trim() || DEFAULT_RETURN_CUTOFF_TIME;
    const intakeClosed = isImportIntakeClosed(cutoff, now.format('YYYY-MM-DD'), returnBufferMinutes, now);

    if (intakeClosed) {
        return now.add(1, 'day').format('YYYY-MM-DD');
    }
    return now.format('YYYY-MM-DD');
};

