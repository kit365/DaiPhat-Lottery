import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';

const scope = createQueryKeyScope('import-batch');

/** Stable string tokens — dùng cho invalidate prefix. */
export const QUERY_KEYS = {
    IMPORT_BATCH_ACTIVE_DRAFT: 'import-batch-active-draft',
    IMPORT_BATCH_LIST: 'import-batch-list',
    IMPORT_BATCH_DETAIL: 'import-batch-detail',
    IMPORT_BATCH_CLASSIFY_PREVIEW: 'import-batch-classify-preview',
    IMPORT_BATCH_ELIGIBLE_STATIONS: 'import-batch-eligible-stations',
    IMPORT_BATCH_TIME_POLICY: 'import-batch-time-policy',
    IMPORT_BATCH_INCOMPLETE: 'import-batch-incomplete',
    IMPORT_BATCH_WITHOUT_LINES: 'import-batch-without-lines',
    IMPORT_BATCH_REDUCTION_TICKETS: 'import-batch-reduction-tickets',
    IMPORT_BATCH_LINE_ENTRY_TICKETS: 'import-batch-line-entry-tickets',
} as const;

/** Typed query key builders — ưu tiên dùng trong hooks. */
export const importBatchQueryKeys = {
    scope,
    activeDraft: () => [QUERY_KEYS.IMPORT_BATCH_ACTIVE_DRAFT] as const,
    list: (params?: unknown) => [QUERY_KEYS.IMPORT_BATCH_LIST, params] as const,
    draftBanner: () => [QUERY_KEYS.IMPORT_BATCH_LIST, 'draft-banner'] as const,
    detail: (id?: string | number | null) =>
        [QUERY_KEYS.IMPORT_BATCH_DETAIL, id != null ? String(id) : id] as const,
    classifyPreview: (params?: unknown) =>
        [QUERY_KEYS.IMPORT_BATCH_CLASSIFY_PREVIEW, params] as const,
    eligibleStations: (drawDate?: string, importMode?: string, excludeBatchId?: unknown) =>
        [QUERY_KEYS.IMPORT_BATCH_ELIGIBLE_STATIONS, drawDate, importMode, excludeBatchId] as const,
    timePolicy: () => [QUERY_KEYS.IMPORT_BATCH_TIME_POLICY] as const,
    incomplete: () => [QUERY_KEYS.IMPORT_BATCH_INCOMPLETE] as const,
    withoutLines: () => [QUERY_KEYS.IMPORT_BATCH_WITHOUT_LINES] as const,
    reductionTickets: (batchId: number) => [QUERY_KEYS.IMPORT_BATCH_REDUCTION_TICKETS, batchId] as const,
    lineEntryTickets: (batchId?: string, lineId?: string) =>
        [QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS, batchId, lineId] as const,
} as const;
