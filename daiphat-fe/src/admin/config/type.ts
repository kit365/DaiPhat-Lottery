export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    timestamp: string;
}

export interface PaginationMetadata {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export interface PageResponse<T> {
    recordList: T[];
    pagination: PaginationMetadata;
    statusCounts?: Record<string, number>;
}

export interface BaseQueryParams {
    page?: number;
    limit?: number;
    size?: number;
    q?: string;
    sortBy?: string;
    direction?: string;
    status?: string;
    roleIds?: string[];
}
