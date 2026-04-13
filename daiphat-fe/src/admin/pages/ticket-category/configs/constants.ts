import { ITicketCategory, ISelectOption } from "./types";

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

export const DemoData: ITicketCategory[] = [
    {
        categoryId: 1,
        name: "Thiết bị điện tử",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "",
        view: 15420,
        createdAt: new Date('2024-01-15T08:30:00'),
        isActive: true,
    },
    {
        categoryId: 2,
        name: "Điện thoại di động",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "Thiết bị điện tử",
        view: 8900,
        createdAt: new Date('2024-02-10T14:20:00'),
        isActive: true,
    },
    {
        categoryId: 3,
        name: "Phụ kiện máy tính",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "Thiết bị điện tử",
        view: 4500,
        createdAt: new Date('2024-03-05T10:00:00'),
        isActive: false,
    },
    {
        categoryId: 4,
        name: "Thời trang nam",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "",
        view: 12300,
        createdAt: new Date('2024-03-12T09:15:00'),
        isActive: true,
    },
    {
        categoryId: 5,
        name: "Áo sơ mi",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "Thời trang nam",
        view: 3200,
        createdAt: new Date('2024-04-01T16:45:00'),
        isActive: true,
    },
    {
        categoryId: 6,
        name: "Đồ gia dụng",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "",
        view: 7800,
        createdAt: new Date('2024-04-10T11:30:00'),
        isActive: false,
    },
    {
        categoryId: 7,
        name: "Máy giặt",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "Đồ gia dụng",
        view: 2100,
        createdAt: new Date('2024-05-20T08:00:00'),
        isActive: true,
    },
    {
        categoryId: 8,
        name: "Tủ lạnh",
        imageUrl: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        parentName: "Đồ gia dụng",
        view: 5400,
        createdAt: new Date('2024-06-01T13:00:00'),
        isActive: true,
    }
];





