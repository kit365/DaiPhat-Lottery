import { prefixAdmin } from "./routes";
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
        path: `/${prefixAdmin}/dashboard/system`,
        permission: "dashboard_view"
    },
    {
        id: "analytics",
        Icon: DataExplorationIcon,
        label: "Phân tích",
        tKey: "admin.sidebar.analytics",
        path: `/${prefixAdmin}/dashboard/analytics`,
        permission: "dashboard_view"
    },
    {
        id: "ecommerce",
        Icon: ShoppingCartIcon,
        label: "Bán hàng",
        path: `/${prefixAdmin}/dashboard/ecommerce`,
        permission: "dashboard_view"
    },
    {
        id: "statistics",
        Icon: AssessmentIcon,
        label: "Thống kê chi tiết",
        permission: "dashboard_view",
        children: [
            { id: "gen-stats", label: "Doanh thu thuần", path: `/${prefixAdmin}/dashboard/statistics/general`, permission: "dashboard_view" },
            { id: "order-stats", label: "Đơn hàng", path: `/${prefixAdmin}/dashboard/statistics/orders`, permission: "dashboard_view" },
            { id: "ticketService-stats", label: "Dịch vụ", path: `/${prefixAdmin}/dashboard/statistics/ticketServices`, permission: "dashboard_view" },
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
            { id: "list", label: "Kho vé số", tKey: "admin.sidebar.list", path: `/${prefixAdmin}/ticket/list`, permission: "ticket_view" },
            { id: "provider", label: "Nhà đài", tKey: "admin.sidebar.provider", path: `/${prefixAdmin}/provider/list`, permission: "provider_view" },
            { id: "category", label: "Loại hình xổ số", tKey: "admin.sidebar.category", path: `/${prefixAdmin}/ticket-category/list`, permission: "ticket_category_view" },
            { id: "attribute", label: "Thông số vé", tKey: "admin.sidebar.attribute", path: `/${prefixAdmin}/ticket/attribute/list`, permission: "ticket_attribute_view" },
            { id: "expired", label: "Vé hết hạn quay", path: `/${prefixAdmin}/ticket/expired`, permission: "ticket_view" },
        ]
    },
    {
        id: "ticketServices",
        label: "Tiện ích / Tra vé",
        Icon: ConfirmationNumberIcon,
        permission: "ticketService_view",
        children: [
            { id: "list", label: "Danh sách tiện ích", path: `/${prefixAdmin}/ticketService/list`, permission: "ticketService_view" },
            { id: "create", label: "Tạo tiện ích mới", path: `/${prefixAdmin}/ticketService/create`, permission: "ticketService_create" },
            { id: "category", label: "Danh mục tiện ích", path: `/${prefixAdmin}/ticketService/categories`, permission: "ticketService_category_view" },
        ]
    },
    {
        id: "blogs",
        label: "Bài viết",
        tKey: "admin.sidebar.blogs",
        Icon: ArticleIcon,
        permission: "blog_view",
        children: [
            { id: "list", label: "Danh sách bài viết", tKey: "admin.sidebar.blog_list", path: `/${prefixAdmin}/blog/list`, permission: "blog_view" },
            { id: "category", label: "Danh mục bài viết", tKey: "admin.sidebar.blog_category", path: `/${prefixAdmin}/blog-category/list`, permission: "blog_category_view" },
        ]
    },
    {
        id: "orders",
        label: "Đơn mua hộ",
        Icon: ArticleIcon,
        path: `/${prefixAdmin}/order/list`,
        permission: "ticket_view",
    },
    {
        id: "ticketServiceOrders",
        label: "Đơn hàng / Mua hộ",
        tKey: "admin.sidebar.ticketServiceOrders",
        Icon: ScheduleSendIcon,
        permission: "ticketServiceOrder_view",
        children: [
            { id: "list", label: "Danh sách đơn hàng", tKey: "admin.sidebar.ticketServiceOrder_list", path: `/${prefixAdmin}/ticketServiceOrder/list`, permission: "ticketServiceOrder_view" },
            { id: "create", label: "Tạo đơn mua hộ", path: `/${prefixAdmin}/ticketServiceOrder/create`, permission: "ticketServiceOrder_create" },
            { id: "config", label: "Cấu hình vé số", path: `/${prefixAdmin}/ticketServiceOrder/config`, permission: "ticketServiceOrder_view" },
        ]
    },
    {
        id: "reviews",
        label: "Đánh giá",
        Icon: RateReviewIcon,
        path: `/${prefixAdmin}/review`,
        permission: "ticket_view"
    },
    {
        id: "roles",
        label: "Nhóm quyền",
        tKey: "admin.sidebar.roles",
        Icon: SecurityIcon,
        permission: "role_view",
        children: [
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.role_list", path: `/${prefixAdmin}/role/list`, permission: "role_view" },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.role_create", path: `/${prefixAdmin}/role/create`, permission: "role_create" },
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
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.account_list", path: `/${prefixAdmin}/account-admin/list`, permission: "account_admin_view" },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.account_create", path: `/${prefixAdmin}/account-admin/create`, permission: "account_admin_create" },
        ]
    },
    {
        id: "users",
        label: "Khách hàng",
        tKey: "admin.sidebar.users",
        Icon: PeopleIcon,
        permission: "account_user_view",
        hideIfStaff: true,
        children: [
            { id: "list", label: "Danh sách", tKey: "admin.sidebar.user_list", path: `/${prefixAdmin}/account-user/list`, permission: "account_user_view" },
            { id: "create", label: "Tạo mới", tKey: "admin.sidebar.user_create", path: `/${prefixAdmin}/account-user/create`, permission: "account_user_create" },
        ]
    },
    {
        id: "chat",
        label: "Hỗ trợ trực tuyến",
        tKey: "admin.sidebar.chat",
        Icon: ChatIcon,
        path: `/${prefixAdmin}/chat`,
        permission: "dashboard_view"
    },
    {
        id: "coupons",
        label: "Mã giảm giá",
        tKey: "admin.sidebar.coupons",
        Icon: DiscountIcon,
        permission: "coupon_view",
        children: [
            { id: "list", label: "Danh sách mã giảm giá", tKey: "admin.sidebar.coupon_list", path: `/${prefixAdmin}/coupon/list`, permission: "coupon_view" },
            { id: "create", label: "Tạo mã giảm giá", tKey: "admin.sidebar.coupon_create", path: `/${prefixAdmin}/coupon/create`, permission: "coupon_create" },
        ]
    },
    {
        id: "calendar",
        label: "Lịch",
        tKey: "admin.sidebar.calendar",
        Icon: CalendarMonthIcon,
        path: `/${prefixAdmin}/calendar`,
        permission: "calendar_view"
    },
    {
        id: "settings",
        label: "Cài đặt",
        tKey: "admin.sidebar.settings",
        Icon: SettingsIcon,
        path: `/${prefixAdmin}/dashboard/settings`,
        permission: "settings_view",
        children: [
            { id: "settings-general", label: "Cài đặt chung", path: `/${prefixAdmin}/dashboard/settings/general` },
            { id: "settings-shipping", label: "Vận chuyển", path: `/${prefixAdmin}/dashboard/settings/shipping` },
            { id: "settings-payment", label: "Thanh toán", path: `/${prefixAdmin}/dashboard/settings/payment` },
            { id: "settings-social", label: "Mạng xã hội", path: `/${prefixAdmin}/dashboard/settings/social` },
            { id: "settings-app-password", label: "Mật khẩu ứng dụng", path: `/${prefixAdmin}/dashboard/settings/app-password` },
            { id: "settings-ticketSubtype", label: "Tỉnh thành quay thưởng", path: `/${prefixAdmin}/settings/ticketSubtype/list`, permission: "ticketSubtype_view" },
        ]
    }
];
