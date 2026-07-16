export const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Ngưng hoạt động',
    PENDING: 'Chờ xử lý',
};

export const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
    { value: 'INACTIVE', label: STATUS_LABELS.INACTIVE },
    { value: 'PENDING', label: STATUS_LABELS.PENDING },
];
