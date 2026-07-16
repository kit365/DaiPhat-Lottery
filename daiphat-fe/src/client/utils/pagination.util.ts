import type { PaginationMetadata } from '../../types/api.type';

type LoosePagination = Partial<PaginationMetadata> & {
    first?: boolean;
    last?: boolean;
    totalElements?: number;
    total?: number;
    size?: number;
    page?: number;
};

/**
 * Normalizes pagination metadata from the API.
 * Handles Jackson/Lombok boolean naming (`first`/`last` vs `isFirst`/`isLast`)
 * and derives missing flags from currentPage/totalPages.
 */
export const normalizePagination = (
    raw?: LoosePagination | null,
    fallbackPage = 1,
    fallbackLimit = 10
): PaginationMetadata => {
    const totalRecords = Number(raw?.totalRecords ?? raw?.totalElements ?? raw?.total ?? 0);
    const limit = Math.max(1, Number(raw?.limit ?? raw?.size ?? fallbackLimit) || fallbackLimit);
    const currentPage = Math.max(1, Number(raw?.currentPage ?? raw?.page ?? fallbackPage) || fallbackPage);
    const totalPagesFromApi = Number(raw?.totalPages);
    const totalPages =
        Number.isFinite(totalPagesFromApi) && totalPagesFromApi > 0
            ? totalPagesFromApi
            : totalRecords > 0
              ? Math.max(1, Math.ceil(totalRecords / limit))
              : 0;

    const isFirst =
        typeof raw?.isFirst === 'boolean'
            ? raw.isFirst
            : typeof raw?.first === 'boolean'
              ? raw.first
              : currentPage <= 1;

    const isLast =
        typeof raw?.isLast === 'boolean'
            ? raw.isLast
            : typeof raw?.last === 'boolean'
              ? raw.last
              : totalPages === 0 || currentPage >= totalPages;

    return {
        totalRecords,
        totalPages,
        currentPage,
        limit,
        isFirst,
        isLast,
    };
};

/** Builds a compact list of page numbers with ellipsis markers (-1). */
export const buildPageItems = (currentPage: number, totalPages: number, siblingCount = 1): number[] => {
    if (totalPages <= 0) return [];
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let p = currentPage - siblingCount; p <= currentPage + siblingCount; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const page = sorted[i];
        if (i > 0 && page - sorted[i - 1] > 1) {
            result.push(-1);
        }
        result.push(page);
    }
    return result;
};
