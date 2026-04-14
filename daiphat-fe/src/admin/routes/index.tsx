import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../components/auth/PermissionGuard";

// Lazy-loaded components
const TicketListPage = lazy(() => import("../pages/ticket/TicketListPage").then(m => ({ default: m.TicketListPage })));
const TicketCreatePage = lazy(() => import("../pages/ticket/TicketCreatePage").then(m => ({ default: m.TicketCreatePage })));
const TicketEditPage = lazy(() => import("../pages/ticket/TicketEditPage").then(m => ({ default: m.TicketEditPage })));
const ExpiredTicketListPage = lazy(() => import("../pages/ticket/ExpiredTicketListPage").then(m => ({ default: m.ExpiredTicketListPage })));
const TicketCategoryListPage = lazy(() => import("../pages/ticket-category/TicketCategoryListPage").then(m => ({ default: m.TicketCategoryListPage })));
const TicketCategoryCreatePage = lazy(() => import("../pages/ticket-category/TicketCategoryCreatePage").then(m => ({ default: m.TicketCategoryCreatePage })));
const TicketCategoryEditPage = lazy(() => import("../pages/ticket-category/TicketCategoryEditPage").then(m => ({ default: m.TicketCategoryEditPage })));
const ProviderListPage = lazy(() => import("../pages/provider/ProviderListPage").then(m => ({ default: m.ProviderListPage })));
const ProviderCreatePage = lazy(() => import("../pages/provider/ProviderCreatePage").then(m => ({ default: m.ProviderCreatePage })));
const ProviderEditPage = lazy(() => import("../pages/provider/ProviderEditPage").then(m => ({ default: m.ProviderEditPage })));
const BlogListPage = lazy(() => import("../pages/blog/BlogListPage").then(m => ({ default: m.BlogListPage })));
const BlogCategoryListPage = lazy(() => import("../pages/blog-category/BlogCategoryListPage").then(m => ({ default: m.BlogCategoryListPage })));
const BlogCategoryCreatePage = lazy(() => import("../pages/blog-category/BlogCategoryCreatePage").then(m => ({ default: m.BlogCategoryCreatePage })));
const BlogCreatePage = lazy(() => import("../pages/blog/BlogCreatePage").then(m => ({ default: m.BlogCreatePage })));
const BlogDetailPage = lazy(() => import("../pages/blog/BlogDetailPage").then(m => ({ default: m.BlogDetailPage })));
const BlogEditPage = lazy(() => import("../pages/blog/BlogEditPage").then(m => ({ default: m.BlogEditPage })));
const LoginPage = lazy(() => import("../pages/authen/LoginPage").then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("../pages/authen/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
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
const RoleCreatePage = lazy(() => import("../pages/role/RoleCreatePage").then(m => ({ default: m.RoleCreatePage })));
const RoleEditPage = lazy(() => import("../pages/role/RoleEditPage").then(m => ({ default: m.RoleEditPage })));
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
const TicketServiceOrderListPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderListPage").then(m => ({ default: m.TicketServiceOrderListPage })));
const TicketServiceOrderCreatePage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderCreatePage").then(m => ({ default: m.TicketServiceOrderCreatePage })));
const TicketServiceOrderEditPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderEditPage").then(m => ({ default: m.TicketServiceOrderEditPage })));
const TicketServiceOrderDetailPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderDetailPage").then(m => ({ default: m.TicketServiceOrderDetailPage })));
const TicketServiceOrderConfigPage = lazy(() => import("../pages/ticket-service-order/TicketServiceOrderConfigPage").then(m => ({ default: m.TicketServiceOrderConfigPage })));
const CalendarPage = lazy(() => import("../pages/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const TicketSubtypeListPage = lazy(() => import("../pages/settings/TicketSubtypeListPage").then(m => ({ default: m.TicketSubtypeListPage })));
const GeneralStatisticsPage = lazy(() => import("../pages/dashboard/statistics/GeneralStatisticsPage").then(m => ({ default: m.GeneralStatisticsPage })));
const OrderStatisticsPage = lazy(() => import("../pages/dashboard/statistics/OrderStatisticsPage").then(m => ({ default: m.OrderStatisticsPage })));
const TicketServiceStatisticsPage = lazy(() => import("../pages/dashboard/statistics/TicketServiceStatisticsPage").then(m => ({ default: m.TicketServiceStatisticsPage })));
const StaffStatisticsPage = lazy(() => import("../pages/dashboard/statistics/StaffStatisticsPage").then(m => ({ default: m.StaffStatisticsPage })));
const ScheduleCalendarPage = lazy(() => import("../pages/hr/ScheduleCalendarPage").then(m => ({ default: m.ScheduleCalendarPage })));
const ShiftListPage = lazy(() => import("../pages/hr/ShiftListPage").then(m => ({ default: m.ShiftListPage })));
const DepartmentListPage = lazy(() => import("../pages/hr/DepartmentListPage").then(m => ({ default: m.DepartmentListPage })));
const OrderListPage = lazy(() => import("../pages/order/OrderListPage").then(m => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import("../pages/order/OrderDetailPage").then(m => ({ default: m.OrderDetailPage })));
const ChatPage = lazy(() => import("../pages/chat/ChatPage").then(m => ({ default: m.ChatPage })));
const ReviewListPage = lazy(() => import("../pages/review/ReviewListPage").then(m => ({ default: m.ReviewListPage })));
const NotificationListPage = lazy(() => import("../pages/notification/NotificationListPage").then(m => ({ default: m.NotificationListPage })));

export const AdminRoutes = [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: "dashboard", element: <PermissionGuard permission="dashboard_view"><DashboardPage /></PermissionGuard> },

    { path: "notifications", element: <NotificationListPage /> },
    { path: "dashboard/system", element: <PermissionGuard permission="dashboard_view"><SystemPage /></PermissionGuard> },
    { path: "dashboard/ecommerce", element: <PermissionGuard permission="dashboard_view"><EcommercePage /></PermissionGuard> },
    { path: "dashboard/analytics", element: <PermissionGuard permission="dashboard_view"><AnalyticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/general", element: <PermissionGuard permission="dashboard_view"><GeneralStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/orders", element: <PermissionGuard permission="dashboard_view"><OrderStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/ticketServices", element: <PermissionGuard permission="dashboard_view"><TicketServiceStatisticsPage /></PermissionGuard> },
    { path: "dashboard/statistics/staff", element: <PermissionGuard permission="dashboard_view"><StaffStatisticsPage /></PermissionGuard> },
    { path: "ticket/list", element: <PermissionGuard permission="ticket_view"><TicketListPage /></PermissionGuard> },
    { path: "ticket/create", element: <PermissionGuard permission="ticket_create"><TicketCreatePage /></PermissionGuard> },
    { path: "ticket/edit/:id", element: <PermissionGuard permission="ticket_edit"><TicketEditPage /></PermissionGuard> },
    { path: "ticket/expired", element: <PermissionGuard permission="ticket_view"><ExpiredTicketListPage /></PermissionGuard> },
    { path: "ticket-category/list", element: <PermissionGuard permission="ticket_category_view"><TicketCategoryListPage /></PermissionGuard> },
    { path: "ticket-category/create", element: <PermissionGuard permission="ticket_category_create"><TicketCategoryCreatePage /></PermissionGuard> },
    { path: "ticket-category/edit/:id", element: <PermissionGuard permission="ticket_category_edit"><TicketCategoryEditPage /></PermissionGuard> },
    { path: "ticket-category/detail/:id", element: <PermissionGuard permission="ticket_category_view"><TicketCategoryEditPage /></PermissionGuard> },
    { path: "provider/list", element: <PermissionGuard permission="provider_view"><ProviderListPage /></PermissionGuard> },
    { path: "provider/create", element: <PermissionGuard permission="provider_create"><ProviderCreatePage /></PermissionGuard> },
    { path: "provider/edit/:id", element: <PermissionGuard permission="provider_edit"><ProviderEditPage /></PermissionGuard> },
    { path: "provider/detail/:id", element: <PermissionGuard permission="provider_view"><ProviderEditPage /></PermissionGuard> },
    { path: "ticketService/list", element: <PermissionGuard permission="ticketService_view"><TicketServiceListPage /></PermissionGuard> },
    { path: "ticketService/create", element: <PermissionGuard permission="ticketService_create"><TicketServiceCreatePage /></PermissionGuard> },
    { path: "ticketService/edit/:id", element: <PermissionGuard permission="ticketService_edit"><TicketServiceEditPage /></PermissionGuard> },
    { path: "ticketService/detail/:id", element: <PermissionGuard permission="ticketService_view"><TicketServiceDetailPage /></PermissionGuard> },
    { path: "ticketService/categories", element: <PermissionGuard permission="ticketService_category_view"><TicketServiceCategoryListPage /></PermissionGuard> },
    { path: "ticketService/categories/create", element: <PermissionGuard permission="ticketService_category_create"><TicketServiceCategoryCreatePage /></PermissionGuard> },
    { path: "ticketService/categories/edit/:id", element: <PermissionGuard permission="ticketService_category_edit"><TicketServiceCategoryEditPage /></PermissionGuard> },
    { path: "ticketService/categories/detail/:id", element: <PermissionGuard permission="ticketService_category_view"><TicketServiceCategoryDetailPage /></PermissionGuard> },
    { path: "blog/list", element: <PermissionGuard permission="blog_view"><BlogListPage /></PermissionGuard> },
    { path: "blog/create", element: <PermissionGuard permission="blog_create"><BlogCreatePage /></PermissionGuard> },
    { path: "blog/edit/:id", element: <PermissionGuard permission="blog_edit"><BlogEditPage /></PermissionGuard> },
    { path: "blog/detail/:id", element: <PermissionGuard permission="blog_view"><BlogDetailPage /></PermissionGuard> },
    { path: "blog-category/list", element: <PermissionGuard permission="blog_category_view"><BlogCategoryListPage /></PermissionGuard> },
    { path: "blog-category/create", element: <PermissionGuard permission="blog_category_create"><BlogCategoryCreatePage /></PermissionGuard> },
    { path: "blog-category/edit/:id", element: <PermissionGuard permission="blog_category_edit"><BlogCategoryEditPage /></PermissionGuard> },
    { path: "blog-category/detail/:id", element: <PermissionGuard permission="blog_category_view"><BlogCategoryEditPage /></PermissionGuard> },
    { path: "coupon/list", element: <PermissionGuard permission="coupon_view"><CouponListPage /></PermissionGuard> },
    { path: "coupon/create", element: <PermissionGuard permission="coupon_create"><CouponCreatePage /></PermissionGuard> },
    { path: "coupon/edit/:id", element: <PermissionGuard permission="coupon_edit"><CouponEditPage /></PermissionGuard> },
    { path: "coupon/detail/:id", element: <PermissionGuard permission="coupon_view"><CouponDetailPage /></PermissionGuard> },
    { path: "ticket/attribute/list", element: <PermissionGuard permission="ticket_attribute_view"><TicketAttributeListPage /></PermissionGuard> },
    { path: "ticket/attribute/create", element: <PermissionGuard permission="ticket_attribute_create"><TicketAttributeCreatePage /></PermissionGuard> },
    { path: "ticket/attribute/edit/:id", element: <PermissionGuard permission="ticket_attribute_edit"><TicketAttributeEditPage /></PermissionGuard> },
    { path: "ticket/attribute/detail/:id", element: <PermissionGuard permission="ticket_attribute_view"><TicketAttributeDetailPage /></PermissionGuard> },
    { path: "role/list", element: <PermissionGuard permission="role_view"><RoleListPage /></PermissionGuard> },
    { path: "role/create", element: <PermissionGuard permission="role_create"><RoleCreatePage /></PermissionGuard> },
    { path: "role/edit/:id", element: <PermissionGuard permission="role_edit"><RoleEditPage /></PermissionGuard> },
    { path: "account-admin/list", element: <PermissionGuard permission="account_admin_view"><AccountAdminListPage /></PermissionGuard> },
    { path: "account-admin/create", element: <PermissionGuard permission="account_admin_create"><AccountAdminCreatePage /></PermissionGuard> },
    { path: "account-admin/edit/:id", element: <PermissionGuard permission="account_admin_edit"><AccountAdminEditPage /></PermissionGuard> },
    { path: "account-admin/detail/:id", element: <PermissionGuard permission="account_admin_view"><AccountAdminDetailPage /></PermissionGuard> },
    { path: "profile", element: <ProfilePage /> },
    { path: "account-admin/change-password/:id", element: <PermissionGuard permission="account_admin_edit"><ChangePasswordAdminPage /></PermissionGuard> },
    { path: "account-user/list", element: <PermissionGuard permission="account_user_view"><AccountUserListPage /></PermissionGuard> },
    { path: "account-user/create", element: <PermissionGuard permission="account_user_create"><AccountUserCreatePage /></PermissionGuard> },
    { path: "account-user/edit/:id", element: <PermissionGuard permission="account_user_edit"><AccountUserEditPage /></PermissionGuard> },
    { path: "account-user/detail/:id", element: <PermissionGuard permission="account_user_view"><AccountUserDetailPage /></PermissionGuard> },
    { path: "account-user/change-password/:id", element: <PermissionGuard permission="account_user_edit"><ChangePasswordUserPage /></PermissionGuard> },
    { path: "ticketServiceOrder/list", element: <PermissionGuard permission="ticketServiceOrder_view"><TicketServiceOrderListPage /></PermissionGuard> },
    { path: "ticketServiceOrder/create", element: <PermissionGuard permission="ticketServiceOrder_create"><TicketServiceOrderCreatePage /></PermissionGuard> },
    { path: "ticketServiceOrder/edit/:id", element: <PermissionGuard permission="ticketServiceOrder_edit"><TicketServiceOrderEditPage /></PermissionGuard> },
    { path: "ticketServiceOrder/detail/:id", element: <PermissionGuard permission="ticketServiceOrder_view"><TicketServiceOrderDetailPage /></PermissionGuard> },
    { path: "ticketServiceOrder/config", element: <PermissionGuard permission="ticketServiceOrder_view"><TicketServiceOrderConfigPage /></PermissionGuard> },
    { path: "order/list", element: <PermissionGuard permission="ticket_view"><OrderListPage /></PermissionGuard> },
    { path: "order/detail/:id", element: <PermissionGuard permission="ticket_view"><OrderDetailPage /></PermissionGuard> },
    { path: "calendar", element: <PermissionGuard permission="calendar_view"><CalendarPage /></PermissionGuard> },
    { path: "dashboard/settings/*", element: <PermissionGuard permission="settings_view"><SettingsPage /></PermissionGuard> },
    { path: "settings/ticket-subtype/list", element: <PermissionGuard permission="ticketSubtype_view"><TicketSubtypeListPage /></PermissionGuard> },
    { path: "schedule-calendar", element: <PermissionGuard permission="schedule_view"><ScheduleCalendarPage /></PermissionGuard> },
    { path: "shifts", element: <PermissionGuard permission="shift_view"><ShiftListPage /></PermissionGuard> },
    { path: "departments", element: <PermissionGuard permission="department_view"><DepartmentListPage /></PermissionGuard> },
    { path: "chat", element: <ChatPage /> },
    { path: "review", element: <ReviewListPage /> },

];

export const AdminAuthRoutes = [
    { path: "auth/login", element: <LoginPage /> },
    { path: "auth/forgot-password", element: <ForgotPasswordPage /> },
];
