import { isAxiosError } from 'axios';

export const isAxiosTimeoutError = (error: unknown): boolean =>
    isAxiosError(error) &&
    (error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        /timeout of \d+ms exceeded/i.test(error.message ?? ''));

export const axiosRequestErrorMessage = (
    error: unknown,
    fallback: string,
    timeoutMessage = 'Thao tác mất quá nhiều thời gian. Vui lòng thử lại; kiểm tra kết quả trước khi gửi lần nữa.'
): string => {
    if (isAxiosTimeoutError(error)) {
        return timeoutMessage;
    }
    const fromApi = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    if (fromApi?.trim()) {
        return fromApi;
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
};
