import type { ApiResponse } from '@/types/api.type';

export const selectApiData = <T>(response: ApiResponse<T> | undefined): T | undefined =>
    response?.data;

export const selectApiDataOrNull = <T>(response: ApiResponse<T>): T | null =>
    response.data ?? null;
