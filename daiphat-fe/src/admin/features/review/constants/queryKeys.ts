import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';

const scope = createQueryKeyScope('admin-reviews');

export const REVIEW_QUERY_KEYS = {
    ALL: 'admin-reviews',
} as const;

export const reviewQueryKeys = {
    scope,
    all: () => [REVIEW_QUERY_KEYS.ALL] as const,
    list: (filters: unknown, page: number, pageSize: number) =>
        [REVIEW_QUERY_KEYS.ALL, filters, page, pageSize] as const,
} as const;
