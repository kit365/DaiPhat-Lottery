import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../components/auth/PermissionGuard";
import { PERMISSIONS } from "../constants/permission.constants";

// Lazy-loaded components
const TicketListPage = lazy(() => import("../features/ticket").then(m => ({ default: m.TicketListPage })));
const TicketCreatePage = lazy(() => import("../features/ticket").then(m => ({ default: m.TicketCreatePage })));
const TicketEditPage = lazy(() => import("../features/ticket").then(m => ({ default: m.TicketEditPage })));
const TicketDetailPage = lazy(() => import("../features/ticket").then(m => ({ default: m.TicketDetailPage })));
const ExpiredTicketListPage = lazy(() => import("../features/ticket").then(m => ({ default: m.ExpiredTicketListPage })));
const PrizeStructureListPage = lazy(() => import("../features/prize-structure").then(m => ({ default: m.PrizeStructureListPage })));
const DrawResultPage = lazy(() => import("../features/draw-result").then(m => ({ default: m.DrawResultPage })));

const StationListPage = lazy(() => import("../features/station").then(m => ({ default: m.StationListPage })));
const StationCreatePage = lazy(() => import("../features/station").then(m => ({ default: m.StationCreatePage })));
const StationEditPage = lazy(() => import("../features/station").then(m => ({ default: m.StationEditPage })));
const StationDetailPage = lazy(() => import("../features/station").then(m => ({ default: m.StationDetailPage })));
const RegionListPage = lazy(() => import("../features/region").then(m => ({ default: m.RegionListPage })));
const BlogListPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogListPage })));
const BlogCategoryListPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogCategoryListPage })));
const BlogCategoryCreatePage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogCategoryCreatePage })));
const BlogTagListPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogTagListPage })));
const BlogCreatePage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogCreatePage })));
const BlogDetailPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogDetailPage })));
const BlogEditPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogEditPage })));
const LoginPage = lazy(() => import("../pages/authen/LoginPage").then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("../pages/authen/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const OAuthCallbackPage = lazy(() => import("../pages/authen/OAuthCallbackPage").then(m => ({ default: m.OAuthCallbackPage })));
const ProfileSetupPage = lazy(() => import("../pages/authen/ProfileSetupPage").then(m => ({ default: m.ProfileSetupPage })));

export { LoginPage, ForgotPasswordPage, OAuthCallbackPage, ProfileSetupPage };
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const SystemPage = lazy(() => import("../pages/dashboard/SystemPage").then(m => ({ default: m.SystemPage })));
const EcommercePage = lazy(() => import("../pages/dashboard/EcommercePage")); // Default export
const AnalyticsPage = lazy(() => import("../pages/dashboard/AnalyticsPage")); // Default export
const BlogCategoryEditPage = lazy(() => import("../features/blogs").then(m => ({ default: m.BlogCategoryEditPage })));
const RoleListPage = lazy(() => import("../features/role").then(m => ({ default: m.RoleListPage })));
const AdminListPage = lazy(() => import("../features/users").then(m => ({ default: m.AdminListPage })));
const AdminCreatePage = lazy(() => import("../features/users").then(m => ({ default: m.AdminCreatePage })));
const AdminEditPage = lazy(() => import("../features/users").then(m => ({ default: m.AdminEditPage })));
const AdminDetailPage = lazy(() => import("../features/users").then(m => ({ default: m.AdminDetailPage })));
const ProfilePage = lazy(() => import("../features/users").then(m => ({ default: m.ProfilePage })));
const AdminChangePasswordPage = lazy(() => import("../features/users").then(m => ({ default: m.AdminChangePasswordPage })));
const ClientListPage = lazy(() => import("../features/users").then(m => ({ default: m.ClientListPage })));
const ClientCreatePage = lazy(() => import("../features/users").then(m => ({ default: m.ClientCreatePage })));
const ClientEditPage = lazy(() => import("../features/users").then(m => ({ default: m.ClientEditPage })));
const ClientDetailPage = lazy(() => import("../features/users").then(m => ({ default: m.ClientDetailPage })));
const ClientChangePasswordPage = lazy(() => import("../features/users").then(m => ({ default: m.ClientChangePasswordPage })));
const StreetAgentListPage = lazy(() => import("../features/street-agent").then(m => ({ default: m.StreetAgentListPage })));
const StreetAgentCreatePage = lazy(() => import("../features/street-agent").then(m => ({ default: m.StreetAgentCreatePage })));
const StreetAgentEditPage = lazy(() => import("../features/street-agent").then(m => ({ default: m.StreetAgentEditPage })));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const SystemConfigListPage = lazy(() => import("../pages/settings/SystemConfigListPage").then(m => ({ default: m.SystemConfigListPage })));
const GeneralStatisticsPage = lazy(() => import("../pages/dashboard/statistics/GeneralStatisticsPage").then(m => ({ default: m.GeneralStatisticsPage })));
const OrderStatisticsPage = lazy(() => import("../pages/dashboard/statistics/OrderStatisticsPage").then(m => ({ default: m.OrderStatisticsPage })));
const StaffStatisticsPage = lazy(() => import("../pages/dashboard/statistics/StaffStatisticsPage").then(m => ({ default: m.StaffStatisticsPage })));
const ScheduleCalendarPage = lazy(() => import("../pages/hr/ScheduleCalendarPage").then(m => ({ default: m.ScheduleCalendarPage })));
const ShiftListPage = lazy(() => import("../pages/hr/ShiftListPage").then(m => ({ default: m.ShiftListPage })));
const DepartmentListPage = lazy(() => import("../pages/hr/DepartmentListPage").then(m => ({ default: m.DepartmentListPage })));
const OrderListPage = lazy(() => import("../features/orders").then(m => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import("../features/orders").then(m => ({ default: m.OrderDetailPage })));
const CounterOrderCreatePage = lazy(() => import("../features/orders").then(m => ({ default: m.CounterOrderCreatePage })));
const ChatPage = lazy(() => import("../features/chat").then(m => ({ default: m.ChatPage })));
const ReviewListPage = lazy(() => import("../pages/review/ReviewListPage").then(m => ({ default: m.ReviewListPage })));
const NotificationListPage = lazy(() => import("../features/notifications").then(m => ({ default: m.NotificationListPage })));
const ImportBatchListPage = lazy(() => import("../features/ticket/import-batch").then(m => ({ default: m.ImportBatchListPage })));
const ImportBatchCreatePage = lazy(() => import("../features/ticket/import-batch").then(m => ({ default: m.ImportBatchCreatePage })));
const ImportBatchEditPage = lazy(() => import("../features/ticket/import-batch").then(m => ({ default: m.ImportBatchEditPage })));
const ImportBatchDetailPage = lazy(() => import("../features/ticket/import-batch").then(m => ({ default: m.ImportBatchDetailPage })));
const SupplierListPage = lazy(() => import("../features/supplier").then(m => ({ default: m.SupplierListPage })));
const SupplierCreatePage = lazy(() => import("../features/supplier").then(m => ({ default: m.SupplierCreatePage })));
const SupplierEditPage = lazy(() => import("../features/supplier").then(m => ({ default: m.SupplierEditPage })));
const RefundListPage = lazy(() => import("../pages/refund/RefundListPage").then(m => ({ default: m.RefundListPage })));
const RefundDetailPage = lazy(() => import("../pages/refund/RefundDetailPage").then(m => ({ default: m.RefundDetailPage })));
const RefundCreatePage = lazy(() => import("../pages/refund/RefundCreatePage").then(m => ({ default: m.RefundCreatePage })));
const OrderCancelWithRefundPage = lazy(() => import("../pages/refund/OrderCancelWithRefundPage").then(m => ({ default: m.OrderCancelWithRefundPage })));

export const AdminRoutes = [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: "dashboard", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}><DashboardPage /></PermissionGuard> },
    { path: "notifications", element: <PermissionGuard permission={PERMISSIONS.NOTIFICATION.VIEW}><NotificationListPage /></PermissionGuard> },
    { path: "dashboard/system", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.SYSTEM}><SystemPage /></PermissionGuard> },
    { path: "dashboard/ecommerce", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ECOMMERCE}><EcommercePage /></PermissionGuard> },
    { path: "dashboard/analytics", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}><AnalyticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/general", element: <PermissionGuard permission={PERMISSIONS.STATISTICS.REVENUE}><GeneralStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/orders", element: <PermissionGuard permission={PERMISSIONS.STATISTICS.ORDER}><OrderStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/staff", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><StaffStatisticsPage /></PermissionGuard> },
    { path: "ticket/list", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketListPage /></PermissionGuard> },
    { path: "ticket/create", element: <PermissionGuard permissions={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.TICKET.VIEW, PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE]}><TicketCreatePage /></PermissionGuard> },
    { path: "import-batch/list", element: <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.VIEW}><ImportBatchListPage /></PermissionGuard> },
    { path: "import-batch/create", element: <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}><ImportBatchCreatePage /></PermissionGuard> },
    { path: "import-batch/edit/:id", element: <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}><ImportBatchEditPage /></PermissionGuard> },
    { path: "import-batch/detail/:id", element: <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.TICKET.CREATE]}><ImportBatchDetailPage /></PermissionGuard> },
    { path: "supplier/list", element: <PermissionGuard permission={PERMISSIONS.SUPPLIER.VIEW}><SupplierListPage /></PermissionGuard> },
    { path: "supplier/create", element: <PermissionGuard permission={PERMISSIONS.SUPPLIER.CREATE}><SupplierCreatePage /></PermissionGuard> },
    { path: "supplier/edit/:id", element: <PermissionGuard permission={PERMISSIONS.SUPPLIER.EDIT}><SupplierEditPage /></PermissionGuard> },
    { path: "ticket/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.EDIT}><TicketEditPage /></PermissionGuard> },
    { path: "ticket/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketDetailPage /></PermissionGuard> },
    { path: "ticket/expired", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><ExpiredTicketListPage /></PermissionGuard> },
    { path: "draw-results", element: <PermissionGuard permission={PERMISSIONS.LOTTERY_RESULT.VIEW}><DrawResultPage /></PermissionGuard> },
    { path: "prize-structures/list", element: <PermissionGuard permission={PERMISSIONS.PRIZE_STRUCTURE.VIEW}><PrizeStructureListPage /></PermissionGuard> },
    { path: "provider/list", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}><StationListPage /></PermissionGuard> },
    { path: "provider/create", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.CREATE}><StationCreatePage /></PermissionGuard> },
    { path: "provider/edit/:id", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.EDIT}><StationEditPage /></PermissionGuard> },
    { path: "provider/detail/:id", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}><StationDetailPage /></PermissionGuard> },
    { path: "region/list", element: <PermissionGuard permission={PERMISSIONS.REGION.VIEW}><RegionListPage /></PermissionGuard> },
    { path: "blog/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogListPage /></PermissionGuard> },
    { path: "blog/create", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}><BlogCreatePage /></PermissionGuard> },
    { path: "blog/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}><BlogEditPage /></PermissionGuard> },
    { path: "blog/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogDetailPage /></PermissionGuard> },
    { path: "blog-category/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogCategoryListPage /></PermissionGuard> },
    { path: "blog-category/create", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}><BlogCategoryCreatePage /></PermissionGuard> },
    { path: "blog-category/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}><BlogCategoryEditPage /></PermissionGuard> },
    { path: "blog-category/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogCategoryEditPage /></PermissionGuard> },
    { path: "blog-tag/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogTagListPage /></PermissionGuard> },
    { path: "role/list", element: <PermissionGuard permission={PERMISSIONS.ROLE.VIEW}><RoleListPage /></PermissionGuard> },
    { path: "account-admin/list", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><AdminListPage /></PermissionGuard> },
    { path: "account-admin/create", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.CREATE}><AdminCreatePage /></PermissionGuard> },
    { path: "account-admin/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}><AdminEditPage /></PermissionGuard> },
    { path: "account-admin/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><AdminDetailPage /></PermissionGuard> },
    { path: "profile", element: <ProfilePage /> },
    { path: "account-admin/change-password/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}><AdminChangePasswordPage /></PermissionGuard> },
    { path: "account-user/list", element: <PermissionGuard permission={PERMISSIONS.USER.VIEW}><ClientListPage /></PermissionGuard> },
    { path: "account-user/create", element: <PermissionGuard permission={PERMISSIONS.USER.CREATE}><ClientCreatePage /></PermissionGuard> },
    { path: "account-user/edit/:id", element: <PermissionGuard permission={PERMISSIONS.USER.EDIT}><ClientEditPage /></PermissionGuard> },
    { path: "account-user/detail/:id", element: <PermissionGuard permission={PERMISSIONS.USER.VIEW}><ClientDetailPage /></PermissionGuard> },
    { path: "account-user/change-password/:id", element: <PermissionGuard permission={PERMISSIONS.USER.EDIT}><ClientChangePasswordPage /></PermissionGuard> },
    { path: "street-agent/list", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.VIEW}><StreetAgentListPage /></PermissionGuard> },
    { path: "street-agent/create", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.CREATE}><StreetAgentCreatePage /></PermissionGuard> },
    { path: "street-agent/edit/:id", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.EDIT}><StreetAgentEditPage /></PermissionGuard> },
    { path: "order/list", element: <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}><OrderListPage /></PermissionGuard> },
    { path: "order/create-counter", element: <PermissionGuard permission={PERMISSIONS.ORDER.CREATE}><CounterOrderCreatePage /></PermissionGuard> },
    { path: "order/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}><OrderDetailPage /></PermissionGuard> },
    { path: "order/detail/:id/cancel-with-refund", element: <PermissionGuard permission={PERMISSIONS.REFUND.PROCESS}><OrderCancelWithRefundPage /></PermissionGuard> },
    { path: "refunds/list", element: <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}><RefundListPage /></PermissionGuard> },
    { path: "refunds/detail/:id", element: <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}><RefundDetailPage /></PermissionGuard> },
    { path: "refunds/create", element: <PermissionGuard permission={PERMISSIONS.REFUND.PROCESS}><RefundCreatePage /></PermissionGuard> },
    { path: "dashboard/settings/*", element: <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}><SettingsPage /></PermissionGuard> },
    { path: "settings/system-config/list", element: <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}><SystemConfigListPage /></PermissionGuard> },
    { path: "chat", element: <PermissionGuard permission={PERMISSIONS.CHAT.VIEW}><ChatPage /></PermissionGuard> },
    { path: "review", element: <ReviewListPage /> },
    { path: "*", element: <Navigate to="/admin/dashboard" replace /> },

];

export const AdminAuthRoutes = [
    { path: "auth/login", element: <LoginPage /> },
    { path: "auth/forgot-password", element: <ForgotPasswordPage /> },
];

export const CommonRoutes = [
    { path: "setup-profile", element: <ProfileSetupPage /> },
    { path: "auth/callback", element: <OAuthCallbackPage /> },
];
