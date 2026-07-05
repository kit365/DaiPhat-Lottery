import dayjs, { type Dayjs } from 'dayjs';
import type { ImportBatchEligibleStation, ImportBatchType } from '../../../api/importBatch.api';
import type { ImportBatchImportMode } from './batchTypeLabels';

const DEFAULT_CUTOFF_TIME = '15:00';

/** Draw date is before today — batch type is always additional import. */
export const isPastDrawDate = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isBefore(dayjs(), 'day');

export const isDrawDateToday = (drawDate?: string) =>
    !!drawDate && dayjs(drawDate).isSame(dayjs(), 'day');

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

/** All eligible stations resolve to post-draw additional import. */
export const areAllStationsAdditionalImport = (stations: ImportBatchEligibleStation[] = []) =>
    stations.length > 0 && stations.every((station) => station.resolvedBatchType === 'ADJUSTMENT');

export type ImportModeLockState =
    | { locked: false }
    | { locked: true; mode: ImportBatchImportMode; reason: string };

/**
 * Resolve whether import mode dropdown should be locked and to which value.
 * - Today before cutoff & draw not completed → lock IN_DAY
 * - Past date / after cutoff / all stations drew → lock POST_DRAW_SUPPLEMENT
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

    if (isDrawDateToday(drawDate) && isAfterImportCutoff(cutoffTime)) {
        return {
            locked: true,
            mode: 'POST_DRAW_SUPPLEMENT',
            reason: `Tự động chọn Nhập vé bổ sung vì đã qua giờ chốt nhập lô (${cutoffTime ?? DEFAULT_CUTOFF_TIME}).`,
        };
    }

    if (isDrawDateToday(drawDate) && !isAfterImportCutoff(cutoffTime)) {
        if (stationsLoaded && areAllStationsAdditionalImport(eligibleStations)) {
            return {
                locked: true,
                mode: 'POST_DRAW_SUPPLEMENT',
                reason: 'Tự động chọn Nhập vé bổ sung vì đài đã quay số.',
            };
        }

        return {
            locked: true,
            mode: 'IN_DAY',
            reason: 'Tự động chọn Nhập vé trong ngày vì ngày quay là hôm nay và chưa đến giờ quay số.',
        };
    }

    return { locked: false };
};

/** Resolved batch type for display when draw has already completed for the selected date. */
export const resolveDisplayBatchType = (
    drawDate?: string,
    resolvedBatchType?: ImportBatchType,
    stationResolvedBatchType?: ImportBatchType
): ImportBatchType | undefined => {
    if (resolvedBatchType) {
        return resolvedBatchType;
    }
    if (stationResolvedBatchType) {
        return stationResolvedBatchType;
    }
    if (isPastDrawDate(drawDate)) {
        return 'ADJUSTMENT';
    }
    return undefined;
};

export const isAdditionalBatchType = (batchType?: ImportBatchType) => batchType === 'ADJUSTMENT';
