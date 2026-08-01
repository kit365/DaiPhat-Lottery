export const RETURN_BATCH_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Bản nháp',
    CONFIRMED: 'Đã xác nhận',
    RETURNED: 'Đã trả',
    CANCELLED: 'Đã hủy',
};

export const RETURN_BATCH_LINE_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    ATTACHED: 'Đã đính kèm',
    RETURNED: 'Đã trả',
    CANCELLED: 'Đã hủy',
};

export const getReturnBatchStatusLabel = (status: string, fallback?: string | null): string => {
    return fallback || RETURN_BATCH_STATUS_LABELS[status] || status || 'Chưa xác định';
};

export const getReturnBatchLineStatusLabel = (status: string, fallback?: string | null): string => {
    return fallback || RETURN_BATCH_LINE_STATUS_LABELS[status] || status || 'Chưa xác định';
};

export const getReturnBatchStatusBadgeClass = (status: string): string => {
    switch (status) {
        case 'CONFIRMED':
        case 'RETURNED':
            return 'bg-green-100 text-green-800';
        case 'DRAFT':
            return 'bg-yellow-100 text-yellow-800';
        case 'CANCELLED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const getReturnBatchStatusChipColor = (status: string): any => {
    switch (status) {
        case 'CONFIRMED':
        case 'RETURNED':
            return 'success';
        case 'DRAFT':
            return 'warning';
        case 'CANCELLED':
            return 'error';
        default:
            return 'default';
    }
};

export const getReturnBatchLineStatusBadgeClass = (status: string): string => {
    switch (status) {
        case 'ATTACHED':
        case 'RETURNED':
            return 'bg-green-100 text-green-800';
        case 'PENDING':
            return 'bg-yellow-100 text-yellow-800';
        case 'CANCELLED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const canAttachSerials = (status: string, lineStatus?: string): boolean => {
    if (lineStatus) {
        return (status === 'DRAFT' || status === 'PENDING') && (lineStatus === 'PENDING' || lineStatus === 'ATTACHED');
    }
    return status === 'DRAFT' || status === 'PENDING';
};

export const isReturnBatchEditable = (status: string): boolean => {
    return status === 'DRAFT' || status === 'PENDING';
};
