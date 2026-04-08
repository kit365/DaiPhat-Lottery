import { ISelectOption } from "./types";

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

export const STATUS_OPTIONS: ISelectOption[] = [
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Tạm dừng' },
];

export const PRICING_TYPE_OPTIONS: ISelectOption[] = [
    { value: 'fixed', label: 'Cố định' },
    { value: 'by-weight', label: 'Theo cân nặng' },
];





