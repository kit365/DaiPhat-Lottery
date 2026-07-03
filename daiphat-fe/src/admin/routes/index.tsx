import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../components/auth/PermissionGuard";
import { PERMISSIONS } from "../constants/permission.constants";

// Lazy-loaded components
const TicketListPage = lazy(() => import("../pages/ticket/TicketListPage").then(m => ({ default: m.TicketListPage })));
const TicketCreatePage = lazy(() => import("../pages/ticket/TicketCreatePage").then(m => ({ default: m.TicketCreatePage })));
const TicketEditPage = lazy(() => import("../pages/ticket/TicketEditPage").then(m => ({ default: m.TicketEditPage })));
const TicketDetailPage = lazy(() => import("../pages/ticket/TicketDetailPage").then(m => ({ default: m.TicketDetailPage })));
const ExpiredTicketListPage = lazy(() => import("../pages/ticket/ExpiredTicketListPage").then(m => ({ default: m.ExpiredTicketListPage })));
const PrizeStructureListPage = lazy(() => import("../pages/prize-structure/PrizeStructureListPage").then(m => ({ default: m.PrizeStructureListPage })));
const DrawResultPage = lazy(() => import("../pages/draw-result/DrawResultPage").then(m => ({ default: m.DrawResultPage })));

const ProviderListPage = lazy(() => import("../pages/provider/ProviderListPage").then(m => ({ default: m.ProviderListPage })));
const ProviderCreatePage = lazy(() => import("../pages/provider/ProviderCreatePage").then(m => ({ default: m.ProviderCreatePage })));
const ProviderEditPage = lazy(() => import("../pages/provider/ProviderEditPage").then(m => ({ default: m.ProviderEditPage })));
const ProviderDetailPage = lazy(() => import("../pages/provider/ProviderDetailPage").then(m => ({ default: m.ProviderDetailPage })));
const RegionListPage = lazy(() => import("../pages/region/RegionListPage").then(m => ({ default: m.RegionListPage })));
const BlogListPage = lazy(() => import("../pages/blog/BlogListPage").then(m => ({ default: m.BlogListPage })));
const BlogCategoryListPage = lazy(() => import("../pages/blog-category/BlogCategoryListPage").then(m => ({ default: m.BlogCategoryListPage })));
const BlogCategoryCreatePage = lazy(() => import("../pages/blog-category/BlogCategoryCreatePage").then(m => ({ default: m.BlogCategoryCreatePage })));
const BlogTagListPage = lazy(() => import("../pages/blog-tag/BlogTagListPage").then(m => ({ default: m.BlogTagListPage })));
const BlogCreatePage = lazy(() => import("../pages/blog/BlogCreatePage").then(m => ({ default: m.BlogCreatePage })));
const BlogDetailPage = lazy(() => import("../pages/blog/BlogDetailPage").then(m => ({ default: m.BlogDetailPage })));
const BlogEditPage = lazy(() => import("../pages/blog/BlogEditPage").then(m => ({ default: m.BlogEditPage })));
const LoginPage = lazy(() => import("../pages/authen/LoginPage").then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("../pages/authen/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const OAuthCallbackPage = lazy(() => import("../pages/authen/OAuthCallbackPage").then(m => ({ default: m.OAuthCallbackPage })));
const ProfileSetupPage = lazy(() => import("../pages/authen/ProfileSetupPage").then(m => ({ default: m.ProfileSetupPage })));
const AcceptInvitePage = lazy(() => import("../pages/authen/AcceptInvitePage").then(m => ({ default: m.AcceptInvitePage })));

export { LoginPage, ForgotPasswordPage, OAuthCallbackPage, ProfileSetupPage, AcceptInvitePage };
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const SystemPage = lazy(() => import("../pages/dashboard/SystemPage").then(m => ({ default: m.SystemPage })));
const EcommercePage = lazy(() => import("../pages/dashboard/EcommercePage")); // Default export
const AnalyticsPage = lazy(() => import("../pages/dashboard/AnalyticsPage")); // Default export
const BlogCategoryEditPage = lazy(() => import("../pages/blog-category/BlogCategoryEditPage").then(m => ({ default: m.BlogCategoryEditPage })));
const CouponListPage = lazy(() => import("../pages/coupon/CouponListPage").then(m => ({ default: m.CouponListPage })));
const CouponCreatePage = lazy(() => import("../pages/coupon/CouponCreatePage").then(m => ({ default: m.CouponCreatePage })));
const CouponEditPage = lazy(() => import("../pages/coupon/CouponEditPage").then(m => ({ default: m.CouponEditPage })));
const CouponDetailPage = lazy(() => import("../pages/coupon/CouponDetailPage").then(m => ({ default: m.CouponDetailPage })));
const TicketAttributeListPage = lazy(() => import("../pages/ticket-attribute/TicketAttributeListPage").then(m => ({ default: m.TicketAttributeListPage })));
const TicketAttributeCreatePage = lazy(() => import("../pages/ticket-attribute/TicketAttributeCreatePage").then(m => ({ default: m.TicketAttributeCreatePage })));
const TicketAttributeEditPage = lazy(() => import("../pages/ticket-attribute/TicketAttributeEditPage").then(m => ({ default: m.TicketAttributeEditPage })));
const TicketAttributeDetailPage = lazy(() => import("../pages/ticket-attribute/TicketAttributeDetailPage").then(m => ({ default: m.TicketAttributeDetailPage })));
const TicketServiceListPage = lazy(() => import("../pages/ticket-service/TicketServiceListPage").then(m => ({ default: m.TicketServiceListPage })));
const TicketServiceCreatePage = lazy(() => import("../pages/ticket-service/TicketServiceCreatePage").then(m => ({ default: m.TicketServiceCreatePage })));
const TicketServiceEditPage = lazy(() => import("../pages/ticket-service/TicketServiceEditPage").then(m => ({ default: m.TicketServiceEditPage })));
const TicketServiceDetailPage = lazy(() => import("../pages/ticket-service/TicketServiceDetailPage").then(m => ({ default: m.TicketServiceDetailPage })));
const TicketServiceCategoryListPage = lazy(() => import("../pages/ticket-service-category/TicketServiceCategoryListPage").then(m => ({ default: m.TicketServiceCategoryListPage })));
const TicketServiceCategoryCreatePage = lazy(() => import("../pages/ticket-service-category/TicketServiceCategoryCreatePage").then(m => ({ default: m.TicketServiceCategoryCreatePage })));
const TicketServiceCategoryEditPage = lazy(() => import("../pages/ticket-service-category/TicketServiceCategoryEditPage").then(m => ({ default: m.TicketServiceCategoryEditPage })));
const TicketServiceCategoryDetailPage = lazy(() => import("../pages/ticket-service-category/TicketServiceCategoryDetailPage").then(m => ({ default: m.TicketServiceCategoryDetailPage })));
const RoleListPage = lazy(() => import("../pages/role/RoleListPage").then(m => ({ default: m.RoleListPage })));
const AccountAdminListPage = lazy(() => import("../pages/account-admin/AccountAdminListPage").then(m => ({ default: m.AccountAdminListPage })));
const AccountAdminCreatePage = lazy(() => import("../pages/account-admin/AccountAdminCreatePage").then(m => ({ default: m.AccountAdminCreatePage })));
const AccountAdminEditPage = lazy(() => import("../pages/account-admin/AccountAdminEditPage").then(m => ({ default: m.AccountAdminEditPage })));
const AccountAdminDetailPage = lazy(() => import("../pages/account-admin/AccountAdminDetailPage").then(m => ({ default: m.AccountAdminDetailPage })));
const ProfilePage = lazy(() => import("../pages/account-admin/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ChangePasswordAdminPage = lazy(() => import("../pages/account-admin/ChangePasswordPage").then(m => ({ default: m.ChangePasswordPage })));
const AccountUserListPage = lazy(() => import("../pages/account-user/AccountUserListPage").then(m => ({ default: m.AccountUserListPage })));
const AccountUserCreatePage = lazy(() => import("../pages/account-user/AccountUserCreatePage").then(m => ({ default: m.AccountUserCreatePage })));
const AccountUserEditPage = lazy(() => import("../pages/account-user/AccountUserEditPage").then(m => ({ default: m.AccountUserEditPage })));
const AccountUserDetailPage = lazy(() => import("../pages/account-user/AccountUserDetailPage").then(m => ({ default: m.AccountUserDetailPage })));
const ChangePasswordUserPage = lazy(() => import("../pages/account-user/ChangePasswordPage").then(m => ({ default: m.ChangePasswordPage })));
const StreetAgentListPage = lazy(() => import("../pages/street-agent/StreetAgentListPage").then(m => ({ default: m.StreetAgentListPage })));
const StreetAgentCreatePage = lazy(() => import("../pages/street-agent/StreetAgentCreatePage").then(m => ({ default: m.StreetAgentCreatePage })));
const StreetAgentEditPage = lazy(() => import("../pages/street-agent/StreetAgentEditPage").then(m => ({ default: m.StreetAgentEditPage })));
const TicketServiceOrderListPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderListPage").then(m => ({ default: m.TicketServiceOrderListPage })));
const TicketServiceOrderCreatePage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderCreatePage").then(m => ({ default: m.TicketServiceOrderCreatePage })));
const TicketServiceOrderEditPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderEditPage").then(m => ({ default: m.TicketServiceOrderEditPage })));
const TicketServiceOrderDetailPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderDetailPage").then(m => ({ default: m.TicketServiceOrderDetailPage })));
const TicketServiceOrderConfigPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderConfigPage").then(m => ({ default: m.TicketServiceOrderConfigPage })));
const CalendarPage = lazy(() => import("../pages/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const TicketSubtypeListPage = lazy(() => import("../pages/settings/TicketSubtypeListPage").then(m => ({ default: m.TicketSubtypeListPage })));
const SystemConfigListPage = lazy(() => import("../pages/settings/SystemConfigListPage").then(m => ({ default: m.SystemConfigListPage })));
const GeneralStatisticsPage = lazy(() => import("../pages/dashboard/statistics/GeneralStatisticsPage").then(m => ({ default: m.GeneralStatisticsPage })));
const OrderStatisticsPage = lazy(() => import("../pages/dashboard/statistics/OrderStatisticsPage").then(m => ({ default: m.OrderStatisticsPage })));
const TicketServiceStatisticsPage = lazy(() => import("../pages/dashboard/statistics/TicketServiceStatisticsPage").then(m => ({ default: m.TicketServiceStatisticsPage })));
const StaffStatisticsPage = lazy(() => import("../pages/dashboard/statistics/StaffStatisticsPage").then(m => ({ default: m.StaffStatisticsPage })));
const ScheduleCalendarPage = lazy(() => import("../pages/hr/ScheduleCalendarPage").then(m => ({ default: m.ScheduleCalendarPage })));
const ShiftListPage = lazy(() => import("../pages/hr/ShiftListPage").then(m => ({ default: m.ShiftListPage })));
const DepartmentListPage = lazy(() => import("../pages/hr/DepartmentListPage").then(m => ({ default: m.DepartmentListPage })));
const OrderListPage = lazy(() => import("../pages/order/OrderListPage").then(m => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import("../pages/order/OrderDetailPage").then(m => ({ default: m.OrderDetailPage })));
const CounterOrderCreatePage = lazy(() => import("../pages/order/CounterOrderCreatePage").then(m => ({ default: m.CounterOrderCreatePage })));
const ChatPage = lazy(() => import("../pages/chat/ChatPage").then(m => ({ default: m.ChatPage })));
const ReviewListPage = lazy(() => import("../pages/review/ReviewListPage").then(m => ({ default: m.ReviewListPage })));
const NotificationListPage = lazy(() => import("../pages/notification/NotificationListPage").then(m => ({ default: m.NotificationListPage })));
const SupportTicketListPage = lazy(() => import("../pages/support-ticket/SupportTicketListPage").then(m => ({ default: m.SupportTicketListPage })));
const SupportTicketDetailPage = lazy(() => import("../pages/support-ticket/SupportTicketDetailPage").then(m => ({ default: m.SupportTicketDetailPage })));
const RefundListPage = lazy(() => import("../pages/refund/RefundListPage").then(m => ({ default: m.RefundListPage })));
const RefundDetailPage = lazy(() => import("../pages/refund/RefundDetailPage").then(m => ({ default: m.RefundDetailPage })));
const ImportBatchCreatePage = lazy(() => import("../pages/import-batch/ImportBatchCreatePage").then(m => ({ default: m.ImportBatchCreatePage })));
const ImportBatchDetailPage = lazy(() => import("../pages/import-batch/ImportBatchDetailPage").then(m => ({ default: m.ImportBatchDetailPage })));

export const AdminRoutes = [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: "dashboard", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}><DashboardPage /></PermissionGuard> },
    { path: "notifications", element: <PermissionGuard permission={PERMISSIONS.NOTIFICATION.VIEW}><NotificationListPage /></PermissionGuard> },
    { path: "dashboard/system", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.SYSTEM}><SystemPage /></PermissionGuard> },
    { path: "dashboard/ecommerce", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ECOMMERCE}><EcommercePage /></PermissionGuard> },
    { path: "dashboard/analytics", element: <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}><AnalyticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/general", element: <PermissionGuard permission={PERMISSIONS.STATISTICS.REVENUE}><GeneralStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/orders", element: <PermissionGuard permission={PERMISSIONS.STATISTICS.ORDER}><OrderStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/ticketServices", element: <PermissionGuard permission={PERMISSIONS.STATISTICS.SERVICE}><TicketServiceStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/staff", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><StaffStatisticsPage /></PermissionGuard> },
    { path: "ticket/list", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketListPage /></PermissionGuard> },
    { path: "ticket/create", element: <PermissionGuard permission={PERMISSIONS.TICKET.CREATE}><TicketCreatePage /></PermissionGuard> },
    { path: "import-batch/create", element: <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}><ImportBatchCreatePage /></PermissionGuard> },
    { path: "import-batch/detail/:id", element: <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.VIEW}><ImportBatchDetailPage /></PermissionGuard> },
    { path: "ticket/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.EDIT}><TicketEditPage /></PermissionGuard> },
    { path: "ticket/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketDetailPage /></PermissionGuard> },
    { path: "ticket/expired", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><ExpiredTicketListPage /></PermissionGuard> },
    { path: "draw-results", element: <PermissionGuard permission={PERMISSIONS.LOTTERY_RESULT.VIEW}><DrawResultPage /></PermissionGuard> },
    { path: "prize-structures/list", element: <PermissionGuard permission={PERMISSIONS.PRIZE_STRUCTURE.VIEW}><PrizeStructureListPage /></PermissionGuard> },
    { path: "provider/list", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}><ProviderListPage /></PermissionGuard> },
    { path: "provider/create", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.CREATE}><ProviderCreatePage /></PermissionGuard> },
    { path: "provider/edit/:id", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.EDIT}><ProviderEditPage /></PermissionGuard> },
    { path: "provider/detail/:id", element: <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}><ProviderDetailPage /></PermissionGuard> },
    { path: "region/list", element: <PermissionGuard permission={PERMISSIONS.REGION.VIEW}><RegionListPage /></PermissionGuard> },
    { path: "ticketService/list", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.VIEW}><TicketServiceListPage /></PermissionGuard> },
    { path: "ticketService/create", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.CREATE}><TicketServiceCreatePage /></PermissionGuard> },
    { path: "ticketService/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.EDIT}><TicketServiceEditPage /></PermissionGuard> },
    { path: "ticketService/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.VIEW}><TicketServiceDetailPage /></PermissionGuard> },
    { path: "ticketService/categories", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.VIEW}><TicketServiceCategoryListPage /></PermissionGuard> },
    { path: "ticketService/categories/create", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.CREATE}><TicketServiceCategoryCreatePage /></PermissionGuard> },
    { path: "ticketService/categories/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.EDIT}><TicketServiceCategoryEditPage /></PermissionGuard> },
    { path: "ticketService/categories/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE.VIEW}><TicketServiceCategoryDetailPage /></PermissionGuard> },
    { path: "blog/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogListPage /></PermissionGuard> },
    { path: "blog/create", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}><BlogCreatePage /></PermissionGuard> },
    { path: "blog/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}><BlogEditPage /></PermissionGuard> },
    { path: "blog/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogDetailPage /></PermissionGuard> },
    { path: "blog-category/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogCategoryListPage /></PermissionGuard> },
    { path: "blog-category/create", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}><BlogCategoryCreatePage /></PermissionGuard> },
    { path: "blog-category/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}><BlogCategoryEditPage /></PermissionGuard> },
    { path: "blog-category/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogCategoryEditPage /></PermissionGuard> },
    { path: "blog-tag/list", element: <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}><BlogTagListPage /></PermissionGuard> },
    { path: "coupon/list", element: <PermissionGuard permission={PERMISSIONS.COUPON.VIEW}><CouponListPage /></PermissionGuard> },
    { path: "coupon/create", element: <PermissionGuard permission={PERMISSIONS.COUPON.CREATE}><CouponCreatePage /></PermissionGuard> },
    { path: "coupon/edit/:id", element: <PermissionGuard permission={PERMISSIONS.COUPON.EDIT}><CouponEditPage /></PermissionGuard> },
    { path: "coupon/detail/:id", element: <PermissionGuard permission={PERMISSIONS.COUPON.VIEW}><CouponDetailPage /></PermissionGuard> },
    { path: "ticket/attribute/list", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketAttributeListPage /></PermissionGuard> },
    { path: "ticket/attribute/create", element: <PermissionGuard permission={PERMISSIONS.TICKET.CREATE}><TicketAttributeCreatePage /></PermissionGuard> },
    { path: "ticket/attribute/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.EDIT}><TicketAttributeEditPage /></PermissionGuard> },
    { path: "ticket/attribute/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}><TicketAttributeDetailPage /></PermissionGuard> },
    { path: "role/list", element: <PermissionGuard permission={PERMISSIONS.ROLE.VIEW}><RoleListPage /></PermissionGuard> },
    { path: "account-admin/list", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><AccountAdminListPage /></PermissionGuard> },
    { path: "account-admin/create", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.CREATE}><AccountAdminCreatePage /></PermissionGuard> },
    { path: "account-admin/edit/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}><AccountAdminEditPage /></PermissionGuard> },
    { path: "account-admin/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}><AccountAdminDetailPage /></PermissionGuard> },
    { path: "profile", element: <ProfilePage /> },
    { path: "account-admin/change-password/:id", element: <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}><ChangePasswordAdminPage /></PermissionGuard> },
    { path: "account-user/list", element: <PermissionGuard permission={PERMISSIONS.USER.VIEW}><AccountUserListPage /></PermissionGuard> },
    { path: "account-user/create", element: <PermissionGuard permission={PERMISSIONS.USER.CREATE}><AccountUserCreatePage /></PermissionGuard> },
    { path: "account-user/edit/:id", element: <PermissionGuard permission={PERMISSIONS.USER.EDIT}><AccountUserEditPage /></PermissionGuard> },
    { path: "account-user/detail/:id", element: <PermissionGuard permission={PERMISSIONS.USER.VIEW}><AccountUserDetailPage /></PermissionGuard> },
    { path: "account-user/change-password/:id", element: <PermissionGuard permission={PERMISSIONS.USER.EDIT}><ChangePasswordUserPage /></PermissionGuard> },
    { path: "street-agent/list", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.VIEW}><StreetAgentListPage /></PermissionGuard> },
    { path: "street-agent/create", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.CREATE}><StreetAgentCreatePage /></PermissionGuard> },
    { path: "street-agent/edit/:id", element: <PermissionGuard permission={PERMISSIONS.STREET_AGENT.EDIT}><StreetAgentEditPage /></PermissionGuard> },
    { path: "ticketServiceOrder/list", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE_ORDER.VIEW}><TicketServiceOrderListPage /></PermissionGuard> },
    { path: "ticketServiceOrder/create", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE_ORDER.VIEW}><TicketServiceOrderCreatePage /></PermissionGuard> },
    { path: "ticketServiceOrder/edit/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE_ORDER.EDIT}><TicketServiceOrderEditPage /></PermissionGuard> },
    { path: "ticketServiceOrder/detail/:id", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE_ORDER.VIEW}><TicketServiceOrderDetailPage /></PermissionGuard> },
    { path: "ticketServiceOrder/config", element: <PermissionGuard permission={PERMISSIONS.TICKET_SERVICE_ORDER.VIEW}><TicketServiceOrderConfigPage /></PermissionGuard> },
    { path: "order/list", element: <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}><OrderListPage /></PermissionGuard> },
    { path: "order/create-counter", element: <PermissionGuard permission={PERMISSIONS.ORDER.CREATE}><CounterOrderCreatePage /></PermissionGuard> },
    { path: "order/detail/:id", element: <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}><OrderDetailPage /></PermissionGuard> },
    { path: "support-tickets/list", element: <PermissionGuard permission={PERMISSIONS.SUPPORT_TICKET.VIEW}><SupportTicketListPage /></PermissionGuard> },
    { path: "support-tickets/detail/:id", element: <PermissionGuard permission={PERMISSIONS.SUPPORT_TICKET.VIEW}><SupportTicketDetailPage /></PermissionGuard> },
    { path: "refunds/list", element: <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}><RefundListPage /></PermissionGuard> },
    { path: "refunds/detail/:id", element: <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}><RefundDetailPage /></PermissionGuard> },
    { path: "calendar", element: <PermissionGuard permission={PERMISSIONS.CALENDAR.VIEW}><CalendarPage /></PermissionGuard> },
    { path: "dashboard/settings/*", element: <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}><SettingsPage /></PermissionGuard> },
    { path: "settings/ticket-subtype/list", element: <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}><TicketSubtypeListPage /></PermissionGuard> },
    { path: "settings/system-config/list", element: <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}><SystemConfigListPage /></PermissionGuard> },
    { path: "chat", element: <ChatPage /> },
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
    { path: "accept-invite", element: <AcceptInvitePage /> },
];
