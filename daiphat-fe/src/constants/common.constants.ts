export const SortOrderEnum = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
} as const;

export type SortOrderType = typeof SortOrderEnum[keyof typeof SortOrderEnum];
