export const COLORS = {
    primary: 'var(--palette-text-primary)',
    secondary: 'var(--palette-text-secondary)',
    border: 'var(--palette-background-neutral)',
    borderLight: 'rgba(145 158 171 / 20%)',
    borderMedium: 'rgba(145 158 171 / 40%)',
    background: 'var(--palette-background-paper)',
    backgroundLight: 'var(--palette-background-neutral)',
    success: 'var(--palette-success-main)',
    shadow: 'var(--customShadows-card)',
};

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
