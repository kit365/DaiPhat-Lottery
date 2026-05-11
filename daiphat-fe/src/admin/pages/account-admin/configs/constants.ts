export const COLORS = {
    primary: 'var(--palette-text-primary)',
    secondary: 'var(--palette-text-secondary)',
    border: 'var(--palette-background-neutral)',
    borderLight: 'rgba(145 158 171 / 20%)',
    borderMedium: 'rgba(145 158 171 / 40%)',
    borderHover: 'var(--palette-action-hover)',
    borderDisabled: 'var(--palette-text-disabled)',
    background: 'var(--palette-background-paper)',
    backgroundLight: 'var(--palette-background-neutral)',
    success: 'var(--palette-success-main)',
    disabled: 'var(--palette-text-disabled)',
    shadow: 'var(--customShadows-card)',
};

export enum RoleEnum {
    ADMIN = 'ROLE_ADMIN',
    MEMBER = 'ROLE_MEMBER',
    STAFF_SHIPPER = 'ROLE_STAFF_SHIPPER',
    STAFF_MANAGER = 'ROLE_STAFF_MANAGER'
}

export const STATUS_LABELS: Record<string, string> = {
    'ACTIVE': 'Hoạt động',
    'PENDING': 'Chờ xử lý',
    'BANNED': 'Bị cấm',
    'LOCKED': 'Bị khóa',
    'DELETED': 'Đã xóa'
};

import { FILTER_ALL } from "../../../constants/sort";

export const STATUS_OPTIONS = [
    { value: FILTER_ALL, label: 'Tất cả' },
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'BANNED', label: 'Bị cấm' },
    { value: 'LOCKED', label: 'Bị khóa' },
];





