import { ROUTES } from "./routes";
import DataExplorationIcon from "@mui/icons-material/DataExploration";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";
import ExtensionIcon from "@mui/icons-material/Extension";
import ArticleIcon from "@mui/icons-material/Article";
import DiscountIcon from "@mui/icons-material/Discount";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PeopleIcon from "@mui/icons-material/People";
import SecurityIcon from "@mui/icons-material/Security";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SettingsIcon from "@mui/icons-material/Settings";


import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RateReviewIcon from "@mui/icons-material/RateReview";
import ChatIcon from "@mui/icons-material/Chat";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FactCheckIcon from "@mui/icons-material/FactCheck";

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
        children: [
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.role_list", path: ROUTES.ADMIN.ROLES.LIST, permission: PERMISSIONS.ROLE.VIEW },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.role_create", path: ROUTES.ADMIN.ROLES.CREATE, permission: PERMISSIONS.ROLE.CREATE },
        ]
    },
    {
        id: "account-management",
        label: "Quản lý tài khoản",
        Icon: PeopleIcon,
        permission: PERMISSIONS.ACCOUNT.VIEW,
        children: [
            { id: "staff-management", label: "Quản lý nhân viên", path: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST, permission: PERMISSIONS.ACCOUNT.VIEW },
            { id: "customer-management", label: "Quản lý khách hàng", path: ROUTES.ADMIN.ACCOUNTS.USER.LIST, permission: PERMISSIONS.USER.VIEW },
            { id: "street-agents", label: "Đại lý bán dạo", path: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST, permission: PERMISSIONS.USER.VIEW },
        ]
    },
    {
        id: "tickets",
        label: "Vé số",
        tKey: "admin.sidebar.tickets",
        Icon: ExtensionIcon,
        permission: PERMISSIONS.TICKET.VIEW,
        children: [
            { id: "list", label: "Kho vé số", tKey: "admin.sidebar.list", path: ROUTES.ADMIN.TICKETS.LIST, permission: PERMISSIONS.TICKET.VIEW },
            { id: "provider", label: "Nhà đài", tKey: "admin.sidebar.provider", path: ROUTES.ADMIN.TICKETS.PROVIDER, permission: PERMISSIONS.PROVIDER.VIEW },
            { id: "region", label: "Vùng miền", path: ROUTES.ADMIN.TICKETS.REGION, permission: PERMISSIONS.PROVIDER.VIEW },
            { id: "attribute", label: "Thông số vé", tKey: "admin.sidebar.attribute", path: ROUTES.ADMIN.TICKETS.ATTRIBUTE, permission: PERMISSIONS.TICKET.VIEW },
            { id: "expired", label: "Vé hết hạn quay", path: ROUTES.ADMIN.TICKETS.EXPIRED, permission: PERMISSIONS.TICKET.VIEW },
        ]
    },
    {
        id: "orders",
        label: "Đơn hàng",
        Icon: ArticleIcon,
        permission: PERMISSIONS.TICKET.VIEW,
        children: [
            { id: "list", label: "Danh sách đơn", path: ROUTES.ADMIN.ORDERS.LIST, permission: PERMISSIONS.TICKET.VIEW },
            { id: "create-counter", label: "Đơn tại quầy", path: ROUTES.ADMIN.ORDERS.CREATE_COUNTER, permission: PERMISSIONS.TICKET.VIEW },
        ]
    },
    {
        id: "prize-structure",
        label: "Cơ cấu giải",
        Icon: EmojiEventsIcon,
        path: ROUTES.ADMIN.TICKETS.PRIZE_STRUCTURE,
        permission: PERMISSIONS.PROVIDER.VIEW,
    },
    {
        id: "draw-results",
        label: "Kết quả Xổ số",
        Icon: FactCheckIcon,
        path: ROUTES.ADMIN.TICKETS.DRAW_RESULT,
        permission: PERMISSIONS.PROVIDER.VIEW, // Assuming it uses same permission for now
    },
];

export const menuDevelopmentData = [
    {
        id: "ticketServices",
        label: "Tiện ích / Tra vé",
        Icon: ConfirmationNumberIcon,
        permission: PERMISSIONS.TICKET_SERVICE.VIEW,
        children: [
            { id: "list", label: "Danh sách tiện ích", path: ROUTES.ADMIN.TICKET_SERVICES.LIST, permission: PERMISSIONS.TICKET_SERVICE.VIEW },
            { id: "create", label: "Tạo tiện ích mới", path: ROUTES.ADMIN.TICKET_SERVICES.CREATE, permission: PERMISSIONS.TICKET_SERVICE.CREATE },
            { id: "category", label: "Danh mục tiện ích", path: ROUTES.ADMIN.TICKET_SERVICES.CATEGORIES, permission: PERMISSIONS.TICKET_SERVICE.VIEW },
        ]
    },
    {
        id: "ticketServiceOrders",
        label: "Đơn hàng / Mua hộ",
        tKey: "admin.sidebar.ticketServiceOrders",
        Icon: ScheduleSendIcon,
        permission: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW,
        children: [
            { id: "list", label: "Danh sách đơn hàng", tKey: "admin.sidebar.ticketServiceOrder_list", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.LIST, permission: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW },
            { id: "create", label: "Tạo đơn mua hộ", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.CREATE, permission: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW },
            { id: "config", label: "Cấu hình vé số", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.CONFIG, permission: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW },
        ]
    },
    {
        id: "reviews",
        label: "Đánh giá",
        Icon: RateReviewIcon,
        path: ROUTES.ADMIN.REVIEWS,
        permission: PERMISSIONS.TICKET.VIEW
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
        id: "coupons",
        label: "Mã giảm giá",
        tKey: "admin.sidebar.coupons",
        Icon: DiscountIcon,
        permission: PERMISSIONS.COUPON.VIEW,
        children: [
            { id: "list", label: "Danh sách mã giảm giá", tKey: "admin.sidebar.coupon_list", path: ROUTES.ADMIN.COUPONS.LIST, permission: PERMISSIONS.COUPON.VIEW },
            { id: "create", label: "Tạo mã giảm giá", tKey: "admin.sidebar.coupon_create", path: ROUTES.ADMIN.COUPONS.CREATE, permission: PERMISSIONS.COUPON.CREATE },
        ]
    },
    {
        id: "calendar",
        label: "Lịch",
        tKey: "admin.sidebar.calendar",
        Icon: CalendarMonthIcon,
        path: ROUTES.ADMIN.CALENDAR,
        permission: PERMISSIONS.CALENDAR.VIEW
    },
    {
        id: "settings",
        label: "Cài đặt",
        tKey: "admin.sidebar.settings",
        Icon: SettingsIcon,
        path: ROUTES.ADMIN.DASHBOARD.SETTINGS.ROOT,
        permission: PERMISSIONS.SETTINGS.VIEW,
        children: [
            { id: "settings-general", label: "Cài đặt chung", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
            { id: "settings-shipping", label: "Vận chuyển", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.SHIPPING },
            { id: "settings-payment", label: "Thanh toán", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.PAYMENT },
            { id: "settings-social", label: "Mạng xã hội", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.SOCIAL },
            { id: "settings-app-password", label: "Mật khẩu ứng dụng", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.APP_PASSWORD },
            { id: "settings-ticketSubtype", label: "Tỉnh thành quay thưởng", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.TICKET_SUBTYPE, permission: PERMISSIONS.SETTINGS.VIEW },
        ]
    }
];
