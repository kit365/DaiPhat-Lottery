import type { ImportBatchFileGroup, ImportBatchFileRow } from '../types/importBatch.type';

/** A draw date is only offered for import when it will produce at least one line. */
export const isGroupSelectable = (group: ImportBatchFileGroup): boolean =>
    group.status === 'IMPORTABLE' && (group.stations?.length ?? 0) > 0;

/** A problem row lifted out of its draw-date group, for the review table. */
export interface ImportBatchFileAnomaly {
    drawDate?: string;
    row: ImportBatchFileRow;
}

/**
 * Every row the operator should look at, gathered across all draw dates.
 *
 * <p>Rows that are merely outside the importable window are excluded: a weekly
 * file always contains those, and listing them would bury the rows that really
 * are wrong. Only issues the file itself caused (unreadable date, unknown
 * station, bad lottery number, duplicate serial, unusable image) show up here.
 */
export const collectAnomalies = (groups: ImportBatchFileGroup[]): ImportBatchFileAnomaly[] =>
    groups.flatMap((group) =>
        group.rows
            .filter((row) =>
                row.issues.some(
                    (issue) => issue.severity === 'ERROR' || issue.severity === 'WARNING'
                )
            )
            .map((row) => ({ drawDate: group.drawDate, row }))
    );
