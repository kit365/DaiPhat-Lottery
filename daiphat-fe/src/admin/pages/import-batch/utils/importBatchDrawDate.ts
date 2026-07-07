import dayjs, { type Dayjs } from 'dayjs';
import type { ImportBatchEligibleStation, ImportBatchType } from '../../../api/importBatch.api';
import type { ImportBatchImportMode } from './batchTypeLabels';

const DEFAULT_CUTOFF_TIME = '15:00';
const DEFAULT_LATE_IMPORT_TIME = '14:30';

/** Draw date is before today — batch type is always additional import. */
export const isPastDrawDate = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isBefore(dayjs(), 'day');

export const isDrawDateToday = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isSame(dayjs(), 'day');

export const isTomorrowDrawDate = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isSame(dayjs().add(1, 'day'), 'day');

export const isFutureBeyondTomorrow = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isAfter(dayjs().add(1, 'day'), 'day');

export const parseImportCutoffTime = (cutoffTime?: string): Dayjs | null => {
    if (!cutoffTime?.trim()) {
        return null;
    }
    const [hourPart, minutePart] = cutoffTime.trim().split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return null;
    }
    return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
};

/** Current clock is after configured same-day import cutoff (default 15:00). */
export const isAfterImportCutoff = (cutoffTime?: string, now: Dayjs = dayjs()) => {
    const cutoff = parseImportCutoffTime(cutoffTime ?? DEFAULT_CUTOFF_TIME);
    if (!cutoff) {
        return false;
    }
    const todayCutoff = now
        .hour(cutoff.hour())
        .minute(cutoff.minute())
        .second(0)
        .millisecond(0);
    return now.isAfter(todayCutoff);
};

export const isInLateImportWindow = (
    lateImportTime?: string,
    cutoffTime?: string,
    now: Dayjs = dayjs()
) => {
    const late = parseImportCutoffTime(lateImportTime ?? DEFAULT_LATE_IMPORT_TIME);
    const cutoff = parseImportCutoffTime(cutoffTime ?? DEFAULT_CUTOFF_TIME);
    if (!late || !cutoff) {
        return false;
    }
    const todayLate = now.hour(late.hour()).minute(late.minute()).second(0).millisecond(0);
    const todayCutoff = now.hour(cutoff.hour()).minute(cutoff.minute()).second(0).millisecond(0);
    return !now.isBefore(todayLate) && !now.isAfter(todayCutoff);
};

/** All eligible stations resolve to post-draw additional import. */
export const areAllStationsAdditionalImport = (stations: ImportBatchEligibleStation[] = []) =>
    stations.length > 0 && stations.every((station) => station.resolvedBatchType === 'ADJUSTMENT');

export type ImportModeLockState =
    | { locked: false }
    | { locked: true; mode: ImportBatchImportMode; reason: string };

/**
 * Resolve whether import mode dropdown should be locked and to which value.
 */
export const resolveImportModeLock = (
    drawDate?: string,
    eligibleStations: ImportBatchEligibleStation[] = [],
    cutoffTime?: string,
    stationsLoaded = true
): ImportModeLockState => {
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

    if (isDrawDateToday(drawDate) && isAfterImportCutoff(cutoffTime)) {
        return {
            locked: true,
            mode: 'POST_DRAW_SUPPLEMENT',
            reason: `Tự động chọn Nhập vé bổ sung vì đã qua giờ chốt nhập lô (${cutoffTime ?? DEFAULT_CUTOFF_TIME}).`,
        };
    }

    if (isDrawDateToday(drawDate) && !isAfterImportCutoff(cutoffTime)) {
        return {
            locked: true,
            mode: 'IN_DAY',
            reason: 'Tự động chọn Nhập vé trong ngày vì ngày quay là hôm nay và chưa qua giờ chốt.',
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
