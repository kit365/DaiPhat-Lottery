import { ROUTES } from "./routes";
import ExtensionIcon from "@mui/icons-material/Extension";
import ArticleIcon from "@mui/icons-material/Article";
import PeopleIcon from "@mui/icons-material/People";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";


import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ChatIcon from "@mui/icons-material/Chat";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PaymentsIcon from "@mui/icons-material/Payments";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";

import { PERMISSIONS } from "./permission.constants";

export const menuOverviewData = [
    {
        id: "system",
        Icon: SettingsIcon,
        label: "Hệ thống",
        path: ROUTES.ADMIN.DASHBOARD.SYSTEM,
        permission: PERMISSIONS.DASHBOARD.SYSTEM
    },

    {
        id: "ecommerce",
        Icon: ShoppingCartIcon,
        label: "Bán hàng",
        path: ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
        permission: PERMISSIONS.DASHBOARD.ECOMMERCE
    },
    {
        id: "revenue",
        Icon: ArticleIcon,
        label: "Doanh thu & Đối soát",
        path: ROUTES.ADMIN.REPORTS.REVENUE,
        permission: PERMISSIONS.DASHBOARD.ECOMMERCE
    },
];


export const menuManagementData = [
    {
        id: "blogs",
        label: "Bài viết",
        tKey: "admin.sidebar.blogs",
        Icon: ArticleIcon,
        permission: PERMISSIONS.ARTICLE.VIEW,
        children: [
            { id: "list", label: "Danh sách bài viết", tKey: "admin.sidebar.blog_list", path: ROUTES.ADMIN.BLOGS.LIST, permission: PERMISSIONS.ARTICLE.VIEW },
            { id: "category", label: "Danh mục bài viết", tKey: "admin.sidebar.blog_category", path: ROUTES.ADMIN.BLOGS.CATEGORIES, permission: PERMISSIONS.ARTICLE.VIEW },
            { id: "tag", label: "Thẻ bài viết", tKey: "admin.sidebar.blog_tag", path: ROUTES.ADMIN.BLOGS.TAGS, permission: PERMISSIONS.ARTICLE.VIEW },
        ]
    },
    {
        id: "roles",
        label: "Nhóm quyền",
        tKey: "admin.sidebar.roles",
        Icon: SecurityIcon,
        permission: PERMISSIONS.ROLE.VIEW,
        path: ROUTES.ADMIN.ROLES.LIST
    },
    {
        id: "account-management",
        label: "Quản lý tài khoản",
        Icon: PeopleIcon,
        permission: PERMISSIONS.ACCOUNT.VIEW,
        children: [
            { id: "staff-management", label: "Quản lý nhân viên", path: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST, permission: PERMISSIONS.ACCOUNT.VIEW },
            { id: "customer-management", label: "Quản lý khách hàng", path: ROUTES.ADMIN.ACCOUNTS.USER.LIST, permission: PERMISSIONS.USER.VIEW },
        ]
    },
    {
        id: "street-agent-management",
        label: "Người bán vé số",
        Icon: StorefrontIcon,
        permission: PERMISSIONS.STREET_AGENT.VIEW,
        children: [
            { id: "street-agents", label: "Hồ sơ người bán vé số", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST, permission: PERMISSIONS.STREET_AGENT.VIEW },
            { id: "street-agent-allocation", label: "Bàn giao vé cho người bán vé số", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION, permission: PERMISSIONS.STREET_AGENT.VIEW },
            { id: "street-agent-allocation-batches", label: "Phiếu bàn giao vé", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES, permission: PERMISSIONS.STREET_AGENT.VIEW },
            { id: "street-agent-reports", label: "Báo cáo người bán vé", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.REPORTS, permission: PERMISSIONS.DASHBOARD.ANALYTICS },
        ]
    },
    {
        id: "supplier-management",
        label: "Nhà cung cấp",
        tKey: "admin.sidebar.supplier_management",
        Icon: LocalShippingIcon,
        permission: PERMISSIONS.SUPPLIER.VIEW,
        children: [
            { id: "supplier", label: "Danh sách", path: ROUTES.ADMIN.SUPPLIER.LIST, permission: PERMISSIONS.SUPPLIER.VIEW },
            { id: "supplier-settlement", label: "Đối soát", path: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST, permission: PERMISSIONS.IMPORT_BATCH.VIEW, badge: 'supplier-settlement-attention' },
            { id: "return-batch", label: "Trả vé", path: ROUTES.ADMIN.RETURN_BATCH.LIST, permission: PERMISSIONS.IMPORT_BATCH.VIEW, badge: 'return-batch-pending' },
        ],
    },
    {
        id: "tickets",
        label: "Vé số",
        tKey: "admin.sidebar.tickets",
        Icon: ExtensionIcon,
        permission: PERMISSIONS.TICKET.VIEW,
        children: [
            { id: "list", label: "Kho vé số", tKey: "admin.sidebar.list", path: ROUTES.ADMIN.TICKETS.LIST, permission: PERMISSIONS.TICKET.VIEW },
            { id: "import-batch", label: "Nhập lô vé", path: ROUTES.ADMIN.IMPORT_BATCH.LIST, permission: PERMISSIONS.IMPORT_BATCH.VIEW },
            { id: "provider", label: "Nhà đài", tKey: "admin.sidebar.provider", path: ROUTES.ADMIN.TICKETS.PROVIDER, permission: PERMISSIONS.PROVIDER.VIEW },
            { id: "region", label: "Vùng miền", path: ROUTES.ADMIN.TICKETS.REGION, permission: PERMISSIONS.REGION.VIEW },
            { id: "street-agent-lucky-patterns", label: "Cấu hình số đẹp", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LUCKY_PATTERNS, permission: PERMISSIONS.STREET_AGENT.VIEW },
        ]
    },
    {
        id: "orders",
        label: "Đơn hàng",
        Icon: ArticleIcon,
        permission: PERMISSIONS.ORDER.VIEW,
        children: [
            { id: "list", label: "Danh sách đơn", path: ROUTES.ADMIN.ORDERS.LIST, permission: PERMISSIONS.ORDER.VIEW, badge: 'orders-online-preparing' },
            { id: "create-counter", label: "Đơn tại quầy", path: ROUTES.ADMIN.ORDERS.CREATE_COUNTER, permission: PERMISSIONS.ORDER.CREATE, badge: 'orders-direct-preparing' },
        ]
    },
    {
        id: "refunds",
        label: "Hoàn tiền",
        Icon: PaymentsIcon,
        path: ROUTES.ADMIN.REFUNDS.LIST,
        permission: PERMISSIONS.REFUND.VIEW,
    },
    {
        id: "prize-payouts",
        label: "Trả thưởng",
        Icon: EmojiEventsIcon,
        path: ROUTES.ADMIN.PRIZE_PAYOUTS.LIST,
        permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
    },
    {
        id: "support-tickets",
        label: "Khiếu nại",
        Icon: SupportAgentIcon,
        permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
        children: [
            {
                id: "list",
                label: "Danh sách khiếu nại",
                path: ROUTES.ADMIN.SUPPORT_TICKETS.LIST,
                permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
                badge: "support-open",
            },
            {
                id: "categories",
                label: "Danh mục khiếu nại",
                path: ROUTES.ADMIN.SUPPORT_TICKETS.CATEGORIES,
                permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
            },
        ],
    },
    {
        id: "chat",
        label: "Hỗ trợ trực tuyến",
        tKey: "admin.sidebar.chat",
        Icon: ChatIcon,
        path: ROUTES.ADMIN.CHAT,
        permission: PERMISSIONS.CHAT.VIEW
    },
    {
        id: "prize-structure",
        label: "Cơ cấu giải",
        Icon: EmojiEventsIcon,
        path: ROUTES.ADMIN.TICKETS.PRIZE_STRUCTURE,
        permission: PERMISSIONS.PRIZE_STRUCTURE.VIEW,
    },
    {
        id: "draw-results",
        label: "Kết quả Xổ số",
        Icon: FactCheckIcon,
        path: ROUTES.ADMIN.TICKETS.DRAW_RESULT,
        permission: PERMISSIONS.LOTTERY_RESULT.VIEW,
    },
];

export const menuDevelopmentData = [
    {
        id: "settings",
        label: "Cài đặt",
        tKey: "admin.sidebar.settings",
        Icon: SettingsIcon,
        path: ROUTES.ADMIN.DASHBOARD.SETTINGS.ROOT,
        permission: PERMISSIONS.SETTINGS.VIEW,
        children: [
            { id: "settings-general", label: "Cài đặt chung", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
            { id: "settings-policies", label: "Chính sách", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.POLICIES },
            { id: "settings-pages", label: "Trang thông tin", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.PAGES },
            { id: "settings-system-config", label: "Cấu hình hệ thống", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.SYSTEM_CONFIG, permission: PERMISSIONS.SETTINGS.VIEW },
        ]
    }
];
