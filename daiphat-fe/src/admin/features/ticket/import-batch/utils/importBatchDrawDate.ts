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

/**
 * Resolve whether import mode dropdown should be locked and to which value.
 * Today / tomorrow → IN_DAY; past / beyond tomorrow → POST_DRAW_SUPPLEMENT.
 */
export const resolveImportModeLock = (drawDate?: string): ImportModeLockState => {
    if (isPastDrawDate(drawDate)) {
        return {
            locked: true,
            mode: 'POST_DRAW_SUPPLEMENT',
            reason: 'Tự động chọn Nhập vé bổ sung vì ngày quay đã qua.',
        };
    }

    if (isTomorrowDrawDate(drawDate)) {
        return {
            locked: true,
            mode: 'IN_DAY',
            reason: 'Tự động chọn Nhập vé trong ngày vì nhập trước cho kỳ quay ngày mai.',
        };
    }

    if (isFutureBeyondTomorrow(drawDate)) {
        return {
            locked: true,
            mode: 'POST_DRAW_SUPPLEMENT',
            reason: 'Chỉ hỗ trợ nhập cho ngày quay hôm nay, ngày mai hoặc ngày đã qua.',
        };
    }

    if (isDrawDateToday(drawDate)) {
        return {
            locked: true,
            mode: 'IN_DAY',
            reason: 'Tự động chọn Nhập vé trong ngày vì ngày quay là hôm nay.',
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
    min: undefined as string | undefined,
    max: dayjs().add(1, 'day').format('YYYY-MM-DD'),
});
