export enum RoleEnum {
    ADMIN = 'ROLE_ADMIN',
    MEMBER = 'ROLE_MEMBER',
    STREET_AGENT = 'ROLE_STREET_AGENT',
    STAFF_OPERATOR = 'ROLE_STAFF_OPERATOR'
}

export const STATUS_LABELS: Record<string, string> = {
    'ACTIVE': 'Hoạt động',
    'PENDING': 'Chờ xử lý',
    'BANNED': 'Bị cấm',
    'LOCKED': 'Bị khóa',
    'DELETED': 'Đã xóa'
};

export const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'BANNED', label: 'Bị cấm' },
    { value: 'LOCKED', label: 'Bị khóa' },
];

export const COLORS = {
    primary: 'var(--palette-text-primary)',
    secondary: 'var(--palette-text-secondary)',
    success: 'var(--palette-success-main)',
    error: 'var(--palette-error-main)',
    warning: 'var(--palette-warning-main)',
    info: 'var(--palette-info-main)',
    disabled: 'var(--palette-text-disabled)',
    border: 'var(--palette-divider)',
    borderLight: 'rgba(145, 158, 171, 0.2)',
    borderMedium: 'rgba(145, 158, 171, 0.4)',
    background: 'var(--palette-background-paper)',
    backgroundLight: 'var(--palette-background-neutral)',
    shadow: 'var(--customShadows-card)',
};






