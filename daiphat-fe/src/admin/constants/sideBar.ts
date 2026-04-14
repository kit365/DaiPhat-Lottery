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
import AssessmentIcon from "@mui/icons-material/Assessment";


import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RateReviewIcon from "@mui/icons-material/RateReview";
import ChatIcon from "@mui/icons-material/Chat";


export const menuOverviewData = [
    {
        id: "system",
        Icon: SettingsIcon,
        label: "Hệ thống",
        path: ROUTES.ADMIN.DASHBOARD.SYSTEM,
        permission: "dashboard_view"
    },
    {
        id: "analytics",
        Icon: DataExplorationIcon,
        label: "Phân tích",
        tKey: "admin.sidebar.analytics",
        path: ROUTES.ADMIN.DASHBOARD.ANALYTICS,
        permission: "dashboard_view"
    },
    {
        id: "ecommerce",
        Icon: ShoppingCartIcon,
        label: "Bán hàng",
        path: ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
        permission: "dashboard_view"
    },
    {
        id: "statistics",
        Icon: AssessmentIcon,
        label: "Thống kê chi tiết",
        permission: "dashboard_view",
        children: [
            { id: "gen-stats", label: "Doanh thu thuần", path: ROUTES.ADMIN.DASHBOARD.STATISTICS.GENERAL, permission: "dashboard_view" },
            { id: "order-stats", label: "Đơn hàng", path: ROUTES.ADMIN.DASHBOARD.STATISTICS.ORDERS, permission: "dashboard_view" },
            { id: "ticketService-stats", label: "Dịch vụ", path: ROUTES.ADMIN.DASHBOARD.STATISTICS.TICKET_SERVICES, permission: "dashboard_view" },
        ]
    },
];


export const menuManagementData = [
    {
        id: "tickets",
        label: "Vé số",
        tKey: "admin.sidebar.tickets",
        Icon: ExtensionIcon,
        permission: "ticket_view",
        children: [
            { id: "list", label: "Kho vé số", tKey: "admin.sidebar.list", path: ROUTES.ADMIN.TICKETS.LIST, permission: "ticket_view" },
            { id: "provider", label: "Nhà đài", tKey: "admin.sidebar.provider", path: ROUTES.ADMIN.TICKETS.PROVIDER, permission: "provider_view" },
            { id: "category", label: "Loại hình xổ số", tKey: "admin.sidebar.category", path: ROUTES.ADMIN.TICKETS.CATEGORY, permission: "ticket_category_view" },
            { id: "attribute", label: "Thông số vé", tKey: "admin.sidebar.attribute", path: ROUTES.ADMIN.TICKETS.ATTRIBUTE, permission: "ticket_attribute_view" },
            { id: "expired", label: "Vé hết hạn quay", path: ROUTES.ADMIN.TICKETS.EXPIRED, permission: "ticket_view" },
        ]
    },
    {
        id: "ticketServices",
        label: "Tiện ích / Tra vé",
        Icon: ConfirmationNumberIcon,
        permission: "ticketService_view",
        children: [
            { id: "list", label: "Danh sách tiện ích", path: ROUTES.ADMIN.TICKET_SERVICES.LIST, permission: "ticketService_view" },
            { id: "create", label: "Tạo tiện ích mới", path: ROUTES.ADMIN.TICKET_SERVICES.CREATE, permission: "ticketService_create" },
            { id: "category", label: "Danh mục tiện ích", path: ROUTES.ADMIN.TICKET_SERVICES.CATEGORIES, permission: "ticketService_category_view" },
        ]
    },
    {
        id: "blogs",
        label: "Bài viết",
        tKey: "admin.sidebar.blogs",
        Icon: ArticleIcon,
        permission: "blog_view",
        children: [
            { id: "list", label: "Danh sách bài viết", tKey: "admin.sidebar.blog_list", path: ROUTES.ADMIN.BLOGS.LIST, permission: "blog_view" },
            { id: "category", label: "Danh mục bài viết", tKey: "admin.sidebar.blog_category", path: ROUTES.ADMIN.BLOGS.CATEGORIES, permission: "blog_category_view" },
        ]
    },
    {
        id: "orders",
        label: "Đơn mua hộ",
        Icon: ArticleIcon,
        path: ROUTES.ADMIN.ORDERS.LIST,
        permission: "ticket_view",
    },
    {
        id: "ticketServiceOrders",
        label: "Đơn hàng / Mua hộ",
        tKey: "admin.sidebar.ticketServiceOrders",
        Icon: ScheduleSendIcon,
        permission: "ticketServiceOrder_view",
        children: [
            { id: "list", label: "Danh sách đơn hàng", tKey: "admin.sidebar.ticketServiceOrder_list", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.LIST, permission: "ticketServiceOrder_view" },
            { id: "create", label: "Tạo đơn mua hộ", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.CREATE, permission: "ticketServiceOrder_create" },
            { id: "config", label: "Cấu hình vé số", path: ROUTES.ADMIN.TICKET_SERVICE_ORDERS.CONFIG, permission: "ticketServiceOrder_view" },
        ]
    },
    {
        id: "reviews",
        label: "Đánh giá",
        Icon: RateReviewIcon,
        path: ROUTES.ADMIN.REVIEWS,
        permission: "ticket_view"
    },
    {
        id: "roles",
        label: "Nhóm quyền",
        tKey: "admin.sidebar.roles",
        Icon: SecurityIcon,
        permission: "role_view",
        children: [
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.role_list", path: ROUTES.ADMIN.ROLES.LIST, permission: "role_view" },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.role_create", path: ROUTES.ADMIN.ROLES.CREATE, permission: "role_create" },
        ]
    },
    {
        id: "accounts",
        label: "Tài khoản quản trị",
        tKey: "admin.sidebar.accounts",
        Icon: PeopleIcon,
        permission: "account_admin_view",
        hideIfStaff: true,
        children: [
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.account_list", path: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST, permission: "account_admin_view" },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.account_create", path: ROUTES.ADMIN.ACCOUNTS.ADMIN.CREATE, permission: "account_admin_create" },
        ]
    },
    {
        id: "members",
        label: "Thành viên",
        tKey: "admin.sidebar.members",
        Icon: PeopleIcon,
        permission: "account_user_view",
        hideIfStaff: true,
        children: [
            { id: "member-list", label: "Danh sách", tKey: "admin.sidebar.member_list", path: ROUTES.ADMIN.ACCOUNTS.MEMBER.LIST, permission: "account_user_view" },
            { id: "member-create", label: "Tạo mới", tKey: "admin.sidebar.member_create", path: ROUTES.ADMIN.ACCOUNTS.MEMBER.CREATE, permission: "account_user_create" },
        ]
    },
    {
        id: "chat",
        label: "Hỗ trợ trực tuyến",
        tKey: "admin.sidebar.chat",
        Icon: ChatIcon,
        path: ROUTES.ADMIN.CHAT,
        permission: "dashboard_view"
    },
    {
        id: "coupons",
        label: "Mã giảm giá",
        tKey: "admin.sidebar.coupons",
        Icon: DiscountIcon,
        permission: "coupon_view",
        children: [
            { id: "list", label: "Danh sách mã giảm giá", tKey: "admin.sidebar.coupon_list", path: ROUTES.ADMIN.COUPONS.LIST, permission: "coupon_view" },
            { id: "create", label: "Tạo mã giảm giá", tKey: "admin.sidebar.coupon_create", path: ROUTES.ADMIN.COUPONS.CREATE, permission: "coupon_create" },
        ]
    },
    {
        id: "calendar",
        label: "Lịch",
        tKey: "admin.sidebar.calendar",
        Icon: CalendarMonthIcon,
        path: ROUTES.ADMIN.CALENDAR,
        permission: "calendar_view"
    },
    {
        id: "settings",
        label: "Cài đặt",
        tKey: "admin.sidebar.settings",
        Icon: SettingsIcon,
        path: ROUTES.ADMIN.DASHBOARD.SETTINGS.ROOT,
        permission: "settings_view",
        children: [
            { id: "settings-general", label: "Cài đặt chung", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
            { id: "settings-shipping", label: "Vận chuyển", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.SHIPPING },
            { id: "settings-payment", label: "Thanh toán", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.PAYMENT },
            { id: "settings-social", label: "Mạng xã hội", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.SOCIAL },
            { id: "settings-app-password", label: "Mật khẩu ứng dụng", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.APP_PASSWORD },
            { id: "settings-ticketSubtype", label: "Tỉnh thành quay thưởng", path: ROUTES.ADMIN.DASHBOARD.SETTINGS.TICKET_SUBTYPE, permission: "ticketSubtype_view" },
        ]
    }
];
