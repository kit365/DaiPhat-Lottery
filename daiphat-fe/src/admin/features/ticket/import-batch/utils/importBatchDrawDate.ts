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

/** True when current clock is still before the supplier's import-allow-from time. */
export const isBeforeSupplierImportAllowFrom = (
    importAllowFrom?: string,
    now: Dayjs = dayjs()
) => {
    const allowFrom = parseClockTime(importAllowFrom);
    if (!allowFrom) {
        return false;
    }
    const todayAllowFrom = now
        .hour(allowFrom.hour())
        .minute(allowFrom.minute())
        .second(0)
        .millisecond(0);
    return now.isBefore(todayAllowFrom);
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
