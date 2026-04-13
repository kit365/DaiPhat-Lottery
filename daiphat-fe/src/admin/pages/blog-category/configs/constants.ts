import { IBlogCategory, ISelectOption } from "./types";

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

export const DemoData: IBlogCategory[] = [
    {
        _id: "1",
        name: "Công nghệ",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "cong-nghe",
        parent: null,
        view: 15420,
        createdAt: new Date('2024-01-15T08:30:00'),
        status: 'active',
    },
    {
        _id: "2",
        name: "Trí tuệ nhân tạo",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "tri-tue-nhan-tao",
        parent: "1",
        view: 8900,
        createdAt: new Date('2024-02-10T14:20:00'),
        status: 'active',
    },
    {
        _id: "3",
        name: "Lập trình",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "lap-trinh",
        parent: "1",
        view: 4500,
        createdAt: new Date('2024-03-05T10:00:00'),
        status: 'inactive',
    },
    {
        _id: "4",
        name: "Kinh doanh",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "kinh-doanh",
        parent: null,
        view: 12300,
        createdAt: new Date('2024-03-12T09:15:00'),
        status: 'active',
    },
    {
        _id: "5",
        name: "Quản lý doanh nghiệp",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "quan-ly-doanh-nghiep",
        parent: "4",
        view: 3200,
        createdAt: new Date('2024-04-01T16:45:00'),
        status: 'active',
    },
    {
        _id: "6",
        name: "Sức khỏe",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "suc-khoe",
        parent: null,
        view: 7800,
        createdAt: new Date('2024-04-10T11:30:00'),
        status: 'inactive',
    },
    {
        _id: "7",
        name: "Dinh dưỡng",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "dinh-duong",
        parent: "6",
        view: 2100,
        createdAt: new Date('2024-05-20T08:00:00'),
        status: 'active',
    },
    {
        _id: "8",
        name: "Tập luyện",
        avatar: "https://api-prod-minimal-v700.pages.dev/assets/images/m-ticket/ticket-1.webp",
        slug: "tap-luyen",
        parent: "6",
        view: 5400,
        createdAt: new Date('2024-06-01T13:00:00'),
        status: 'active',
    }
];





