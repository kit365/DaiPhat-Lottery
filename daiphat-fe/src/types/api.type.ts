export interface ApiResponse<T> {
    code?: string;
    isSuccess?: boolean;
    success?: boolean;
    message?: string;
    timestamp?: string;
    data?: T;
}

export interface EnumOptionResponse {
    value: string;
    label: string;
}

export interface PaginationMetadata {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    isFirst: boolean;
    isLast: boolean;
}

export interface PageResponse<T> {
    recordList: T[];
    pagination: PaginationMetadata;
    statusCounts?: Record<string, number>;
}
