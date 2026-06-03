export interface ApiResponse<T> {
    code?: string;
    isSuccess?: boolean;
    success?: boolean;
    message?: string;
    timestamp?: string;
    data?: T;
}
