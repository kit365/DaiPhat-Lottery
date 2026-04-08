import { IProvider, ISelectOption } from "./types";

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

export const DemoData: IProvider[] = [
    {
        providerId: 1,
        name: "Royal Canin",
        description: "Thương hiệu thức ăn cho thú cưng hàng đầu thế giới",
        logoUrl: "https://example.com/providers/royal-canin-logo.png",
        altImage: "Royal Canin Logo",
        websiteUrl: "https://www.royalcanin.com",
        isActive: false,
        isDeleted: false,
        createdAt: "2026-01-16T08:08:46.224397",
        updatedAt: "2026-01-16T08:08:46.224397",
        createdBy: "system",
        updatedBy: "system"
    },
    {
        providerId: 2,
        name: "Pedigree",
        description: "Thức ăn cho chó với công thức dinh dưỡng cân bằng",
        logoUrl: "https://example.com/providers/pedigree-logo.png",
        altImage: "Pedigree Logo",
        websiteUrl: "https://www.pedigree.com",
        isActive: false,
        isDeleted: false,
        createdAt: "2026-01-16T08:08:46.238539",
        updatedAt: "2026-01-16T08:08:46.238539",
        createdBy: "system",
        updatedBy: "system"
    },
];





