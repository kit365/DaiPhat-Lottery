import React, { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../components/auth/PermissionGuard";
import { PERMISSIONS } from "../constants/permission.constants";

// Lazy-loaded components targeting specific page files directly
const TicketListPage = lazy(() => import("../features/ticket/inventory/components/pages/TicketListPage").then(m => ({ default: m.TicketListPage })));
const TicketCreatePage = lazy(() => import("../features/ticket/inventory/components/pages/TicketCreatePage").then(m => ({ default: m.TicketCreatePage })));
const TicketEditPage = lazy(() => import("../features/ticket/inventory/components/pages/TicketEditPage").then(m => ({ default: m.TicketEditPage })));
const TicketDetailPage = lazy(() => import("../features/ticket/inventory/components/pages/TicketDetailPage").then(m => ({ default: m.TicketDetailPage })));
const ExpiredTicketListPage = lazy(() => import("../features/ticket/inventory/components/pages/ExpiredTicketListPage").then(m => ({ default: m.ExpiredTicketListPage })));
const PrizeStructureListPage = lazy(() => import("../features/prize-structure/components/pages/PrizeStructureListPage").then(m => ({ default: m.PrizeStructureListPage })));
const DrawResultPage = lazy(() => import("../features/draw-result/components/pages/DrawResultPage").then(m => ({ default: m.DrawResultPage })));

const StationListPage = lazy(() => import("../features/station/components/pages/StationListPage").then(m => ({ default: m.StationListPage })));
const StationCreatePage = lazy(() => import("../features/station/components/pages/StationCreatePage").then(m => ({ default: m.StationCreatePage })));
const StationEditPage = lazy(() => import("../features/station/components/pages/StationEditPage").then(m => ({ default: m.StationEditPage })));
const StationDetailPage = lazy(() => import("../features/station/components/pages/StationDetailPage").then(m => ({ default: m.StationDetailPage })));
const RegionListPage = lazy(() => import("../features/region/components/pages/RegionListPage").then(m => ({ default: m.RegionListPage })));
const BlogListPage = lazy(() => import("../features/blogs/components/pages/BlogListPage").then(m => ({ default: m.BlogListPage })));
const BlogCategoryListPage = lazy(() => import("../features/blogs/components/pages/BlogCategoryListPage").then(m => ({ default: m.BlogCategoryListPage })));
const BlogCategoryCreatePage = lazy(() => import("../features/blogs/components/pages/BlogCategoryCreatePage").then(m => ({ default: m.BlogCategoryCreatePage })));
const BlogTagListPage = lazy(() => import("../features/blogs/components/pages/BlogTagListPage").then(m => ({ default: m.BlogTagListPage })));
const BlogCreatePage = lazy(() => import("../features/blogs/components/pages/BlogCreatePage").then(m => ({ default: m.BlogCreatePage })));
const BlogDetailPage = lazy(() => import("../features/blogs/components/pages/BlogDetailPage").then(m => ({ default: m.BlogDetailPage })));
const BlogEditPage = lazy(() => import("../features/blogs/components/pages/BlogEditPage").then(m => ({ default: m.BlogEditPage })));
const BlogCategoryEditPage = lazy(() => import("../features/blogs/components/pages/BlogCategoryEditPage").then(m => ({ default: m.BlogCategoryEditPage })));

const LoginPage = lazy(() => import("../pages/authen/LoginPage").then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("../pages/authen/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const OAuthCallbackPage = lazy(() => import("../pages/authen/OAuthCallbackPage").then(m => ({ default: m.OAuthCallbackPage })));
const ProfileSetupPage = lazy(() => import("../pages/authen/ProfileSetupPage").then(m => ({ default: m.ProfileSetupPage })));

export { LoginPage, ForgotPasswordPage, OAuthCallbackPage, ProfileSetupPage };
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const SystemPage = lazy(() => import("../pages/dashboard/SystemPage").then(m => ({ default: m.SystemPage })));
const EcommercePage = lazy(() => import("../pages/dashboard/EcommercePage")); 
const AnalyticsPage = lazy(() => import("../pages/dashboard/AnalyticsPage")); 
const RoleListPage = lazy(() => import("../features/role/components/pages/RoleListPage").then(m => ({ default: m.RoleListPage })));
const AdminListPage = lazy(() => import("../features/users/components/pages/AdminListPage").then(m => ({ default: m.AdminListPage })));
const AdminCreatePage = lazy(() => import("../features/users/components/pages/AdminCreatePage").then(m => ({ default: m.AdminCreatePage })));
const AdminEditPage = lazy(() => import("../features/users/components/pages/AdminEditPage").then(m => ({ default: m.AdminEditPage })));
const AdminDetailPage = lazy(() => import("../features/users/components/pages/AdminDetailPage").then(m => ({ default: m.AdminDetailPage })));
const ProfilePage = lazy(() => import("../features/users/components/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const AdminChangePasswordPage = lazy(() => import("../features/users/components/pages/AdminChangePasswordPage").then(m => ({ default: m.AdminChangePasswordPage })));
const ClientListPage = lazy(() => import("../features/users/components/pages/ClientListPage").then(m => ({ default: m.ClientListPage })));
const ClientCreatePage = lazy(() => import("../features/users/components/pages/ClientCreatePage").then(m => ({ default: m.ClientCreatePage })));
const ClientEditPage = lazy(() => import("../features/users/components/pages/ClientEditPage").then(m => ({ default: m.ClientEditPage })));
const ClientDetailPage = lazy(() => import("../features/users/components/pages/ClientDetailPage").then(m => ({ default: m.ClientDetailPage })));
const ClientChangePasswordPage = lazy(() => import("../features/users/components/pages/ClientChangePasswordPage").then(m => ({ default: m.ClientChangePasswordPage })));
const StreetAgentListPage = lazy(() => import("../features/street-agent/components/pages/StreetAgentListPage").then(m => ({ default: m.StreetAgentListPage })));
const StreetAgentCreatePage = lazy(() => import("../features/street-agent/components/pages/StreetAgentCreatePage").then(m => ({ default: m.StreetAgentCreatePage })));
const StreetAgentEditPage = lazy(() => import("../features/street-agent/components/pages/StreetAgentEditPage").then(m => ({ default: m.StreetAgentEditPage })));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const SystemConfigListPage = lazy(() => import("../features/system-config/components/pages/SystemConfigListPage").then(m => ({ default: m.SystemConfigListPage })));
const GeneralStatisticsPage = lazy(() => import("../pages/dashboard/statistics/GeneralStatisticsPage").then(m => ({ default: m.GeneralStatisticsPage })));
const OrderStatisticsPage = lazy(() => import("../pages/dashboard/statistics/OrderStatisticsPage").then(m => ({ default: m.OrderStatisticsPage })));
const StaffStatisticsPage = lazy(() => import("../pages/dashboard/statistics/StaffStatisticsPage").then(m => ({ default: m.StaffStatisticsPage })));
const ScheduleCalendarPage = lazy(() => import("../pages/hr/ScheduleCalendarPage").then(m => ({ default: m.ScheduleCalendarPage })));
const ShiftListPage = lazy(() => import("../pages/hr/ShiftListPage").then(m => ({ default: m.ShiftListPage })));
const DepartmentListPage = lazy(() => import("../pages/hr/DepartmentListPage").then(m => ({ default: m.DepartmentListPage })));
const OrderListPage = lazy(() => import("../features/orders/components/pages/OrderListPage").then(m => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import("../features/orders/components/pages/OrderDetailPage").then(m => ({ default: m.OrderDetailPage })));
const CounterOrderCreatePage = lazy(() => import("../features/orders/components/pages/CounterOrderCreatePage").then(m => ({ default: m.CounterOrderCreatePage })));
const ChatPage = lazy(() => import("../features/chat/components/pages/ChatPage").then(m => ({ default: m.ChatPage })));
const ReviewListPage = lazy(() => import("../pages/review/ReviewListPage").then(m => ({ default: m.ReviewListPage })));
const NotificationListPage = lazy(() => import("../features/notifications/components/pages/NotificationListPage").then(m => ({ default: m.NotificationListPage })));
const ImportBatchListPage = lazy(() => import("../features/ticket/import-batch/components/pages/ImportBatchListPage").then(m => ({ default: m.ImportBatchListPage })));
const ImportBatchCreatePage = lazy(() => import("../features/ticket/import-batch/components/pages/ImportBatchCreatePage").then(m => ({ default: m.ImportBatchCreatePage })));
const ImportBatchEditPage = lazy(() => import("../features/ticket/import-batch/components/pages/ImportBatchEditPage").then(m => ({ default: m.ImportBatchEditPage })));
const ImportBatchDetailPage = lazy(() => import("../features/ticket/import-batch/components/pages/ImportBatchDetailPage").then(m => ({ default: m.ImportBatchDetailPage })));
const ImportBatchLineDetailPage = lazy(() => import("../features/ticket/import-batch/components/pages/ImportBatchLineDetailPage").then(m => ({ default: m.ImportBatchLineDetailPage })));
const ReturnBatchListPage = lazy(() => import("../features/ticket/return-batch/components/pages/ReturnBatchListPage").then(m => ({ default: m.ReturnBatchListPage })));
const ReturnBatchEditPage = lazy(() => import("../features/ticket/return-batch/components/pages/ReturnBatchEditPage").then(m => ({ default: m.ReturnBatchEditPage })));
const ReturnBatchDetailPage = lazy(() => import("../features/ticket/return-batch/components/pages/ReturnBatchDetailPage").then(m => ({ default: m.ReturnBatchDetailPage })));
const SupplierSettlementListPage = lazy(() => import("../features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage").then(m => ({ default: m.SupplierSettlementListPage })));
const SupplierSettlementDetailPage = lazy(() => import("../features/ticket/supplier-settlement/components/pages/SupplierSettlementDetailPage").then(m => ({ default: m.SupplierSettlementDetailPage })));
const SupplierListPage = lazy(() => import("../features/supplier/components/pages/SupplierListPage").then(m => ({ default: m.SupplierListPage })));
const SupplierCreatePage = lazy(() => import("../features/supplier/components/pages/SupplierCreatePage").then(m => ({ default: m.SupplierCreatePage })));
const SupplierDetailPage = lazy(() => import("../features/supplier/components/pages/SupplierDetailPage").then(m => ({ default: m.SupplierDetailPage })));
const SupplierEditPage = lazy(() => import("../features/supplier/components/pages/SupplierEditPage").then(m => ({ default: m.SupplierEditPage })));
const RefundListPage = lazy(() => import("../pages/refund/RefundListPage").then(m => ({ default: m.RefundListPage })));
const RefundDetailPage = lazy(() => import("../pages/refund/RefundDetailPage").then(m => ({ default: m.RefundDetailPage })));
const PrizePayoutListPage = lazy(() => import("../pages/prize-payout/PrizePayoutListPage").then(m => ({ default: m.PrizePayoutListPage })));
const PrizePayoutDetailPage = lazy(() => import("../pages/prize-payout/PrizePayoutDetailPage").then(m => ({ default: m.PrizePayoutDetailPage })));
const RefundCreatePage = lazy(() => import("../pages/refund/RefundCreatePage").then(m => ({ default: m.RefundCreatePage })));
const OrderCancelWithRefundPage = lazy(() => import("../pages/refund/OrderCancelWithRefundPage").then(m => ({ default: m.OrderCancelWithRefundPage })));
const SupportTicketListPage = lazy(() => import("../features/support-ticket/components/pages/SupportTicketListPage").then(m => ({ default: m.SupportTicketListPage })));
const SupportTicketDetailPage = lazy(() => import("../features/support-ticket/components/pages/SupportTicketDetailPage").then(m => ({ default: m.SupportTicketDetailPage })));
const TicketCategoryListPage = lazy(() => import("../features/support-ticket/components/pages/TicketCategoryListPage").then(m => ({ default: m.TicketCategoryListPage })));

export interface AdminRouteItem {
  path?: string;
  index?: boolean;
  permission?: string;
  permissions?: string[];
  Component?: React.ComponentType<any>;
  element?: React.ReactNode;
}

export const AdminRoutes: AdminRouteItem[] = [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: "dashboard", permission: PERMISSIONS.DASHBOARD.ANALYTICS, Component: DashboardPage },
    { path: "notifications", permission: PERMISSIONS.NOTIFICATION.VIEW, Component: NotificationListPage },
    { path: "dashboard/system", permission: PERMISSIONS.DASHBOARD.SYSTEM, Component: SystemPage },
    { path: "dashboard/ecommerce", permission: PERMISSIONS.DASHBOARD.ECOMMERCE, Component: EcommercePage },
    { path: "dashboard/analytics", permission: PERMISSIONS.DASHBOARD.ANALYTICS, Component: AnalyticsPage },
    { path: "dashboard/statistics/general", permission: PERMISSIONS.STATISTICS.REVENUE, Component: GeneralStatisticsPage },
    { path: "dashboard/statistics/orders", permission: PERMISSIONS.STATISTICS.ORDER, Component: OrderStatisticsPage },
    { path: "dashboard/statistics/staff", permission: PERMISSIONS.ACCOUNT.VIEW, Component: StaffStatisticsPage },
    { path: "ticket/list", permission: PERMISSIONS.TICKET.VIEW, Component: TicketListPage },
    { path: "ticket/create", permissions: [PERMISSIONS.TICKET.CREATE, PERMISSIONS.TICKET.VIEW, PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE], Component: TicketCreatePage },
    { path: "import-batch/list", permission: PERMISSIONS.IMPORT_BATCH.VIEW, Component: ImportBatchListPage },
    { path: "import-batch/create", permission: PERMISSIONS.IMPORT_BATCH.CREATE, Component: ImportBatchCreatePage },
    { path: "import-batch/edit/:id", permission: PERMISSIONS.IMPORT_BATCH.CREATE, Component: ImportBatchEditPage },
    { path: "import-batch/detail/:id", permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.TICKET.CREATE], Component: ImportBatchDetailPage },
    { path: "import-batch/detail/:id/line/:lineId", permission: PERMISSIONS.IMPORT_BATCH.VIEW, Component: ImportBatchLineDetailPage },
    { path: "return-batch/list", permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW], Component: ReturnBatchListPage },
    { path: "return-batch/edit/:id", permission: PERMISSIONS.IMPORT_BATCH.CREATE, Component: ReturnBatchEditPage },
    { path: "return-batch/detail/:id", permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.SUPPLIER.VIEW], Component: ReturnBatchDetailPage },
    { path: "supplier-settlement/list", permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW], Component: SupplierSettlementListPage },
    { path: "supplier-settlement/detail/:id", permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW], Component: SupplierSettlementDetailPage },
    { path: "supplier/list", permission: PERMISSIONS.SUPPLIER.VIEW, Component: SupplierListPage },
    { path: "supplier/create", permission: PERMISSIONS.SUPPLIER.CREATE, Component: SupplierCreatePage },
    { path: "supplier/detail/:id", permission: PERMISSIONS.SUPPLIER.VIEW, Component: SupplierDetailPage },
    { path: "supplier/edit/:id", permission: PERMISSIONS.SUPPLIER.EDIT, Component: SupplierEditPage },
    { path: "ticket/edit/:id", permission: PERMISSIONS.TICKET.EDIT, Component: TicketEditPage },
    { path: "ticket/detail/:id", permission: PERMISSIONS.TICKET.VIEW, Component: TicketDetailPage },
    { path: "ticket/expired", permission: PERMISSIONS.TICKET.VIEW, Component: ExpiredTicketListPage },
    { path: "draw-results", permission: PERMISSIONS.LOTTERY_RESULT.VIEW, Component: DrawResultPage },
    { path: "prize-structures/list", permission: PERMISSIONS.PRIZE_STRUCTURE.VIEW, Component: PrizeStructureListPage },
    { path: "provider/list", permission: PERMISSIONS.PROVIDER.VIEW, Component: StationListPage },
    { path: "provider/create", permission: PERMISSIONS.PROVIDER.CREATE, Component: StationCreatePage },
    { path: "provider/edit/:id", permission: PERMISSIONS.PROVIDER.EDIT, Component: StationEditPage },
    { path: "provider/detail/:id", permission: PERMISSIONS.PROVIDER.VIEW, Component: StationDetailPage },
    { path: "region/list", permission: PERMISSIONS.REGION.VIEW, Component: RegionListPage },
    { path: "blog/list", permission: PERMISSIONS.ARTICLE.VIEW, Component: BlogListPage },
    { path: "blog/create", permission: PERMISSIONS.ARTICLE.CREATE, Component: BlogCreatePage },
    { path: "blog/edit/:id", permission: PERMISSIONS.ARTICLE.EDIT, Component: BlogEditPage },
    { path: "blog/detail/:id", permission: PERMISSIONS.ARTICLE.VIEW, Component: BlogDetailPage },
    { path: "blog-category/list", permission: PERMISSIONS.ARTICLE.VIEW, Component: BlogCategoryListPage },
    { path: "blog-category/create", permission: PERMISSIONS.ARTICLE.CREATE, Component: BlogCategoryCreatePage },
    { path: "blog-category/edit/:id", permission: PERMISSIONS.ARTICLE.EDIT, Component: BlogCategoryEditPage },
    { path: "blog-category/detail/:id", permission: PERMISSIONS.ARTICLE.VIEW, Component: BlogCategoryEditPage },
    { path: "blog-tag/list", permission: PERMISSIONS.ARTICLE.VIEW, Component: BlogTagListPage },
    { path: "role/list", permission: PERMISSIONS.ROLE.VIEW, Component: RoleListPage },
    { path: "account-admin/list", permission: PERMISSIONS.ACCOUNT.VIEW, Component: AdminListPage },
    { path: "account-admin/create", permission: PERMISSIONS.ACCOUNT.CREATE, Component: AdminCreatePage },
    { path: "account-admin/edit/:id", permission: PERMISSIONS.ACCOUNT.EDIT, Component: AdminEditPage },
    { path: "account-admin/detail/:id", permission: PERMISSIONS.ACCOUNT.VIEW, Component: AdminDetailPage },
    { path: "profile", Component: ProfilePage },
    { path: "account-admin/change-password/:id", permission: PERMISSIONS.ACCOUNT.EDIT, Component: AdminChangePasswordPage },
    { path: "account-user/list", permission: PERMISSIONS.USER.VIEW, Component: ClientListPage },
    { path: "account-user/create", permission: PERMISSIONS.USER.CREATE, Component: ClientCreatePage },
    { path: "account-user/edit/:id", permission: PERMISSIONS.USER.EDIT, Component: ClientEditPage },
    { path: "account-user/detail/:id", permission: PERMISSIONS.USER.VIEW, Component: ClientDetailPage },
    { path: "account-user/change-password/:id", permission: PERMISSIONS.USER.EDIT, Component: ClientChangePasswordPage },
    { path: "street-agent/list", permission: PERMISSIONS.STREET_AGENT.VIEW, Component: StreetAgentListPage },
    { path: "street-agent/create", permission: PERMISSIONS.STREET_AGENT.CREATE, Component: StreetAgentCreatePage },
    { path: "street-agent/edit/:id", permission: PERMISSIONS.STREET_AGENT.EDIT, Component: StreetAgentEditPage },
    { path: "order/list", permission: PERMISSIONS.ORDER.VIEW, Component: OrderListPage },
    { path: "order/create-counter", permission: PERMISSIONS.ORDER.CREATE, Component: CounterOrderCreatePage },
    { path: "order/detail/:id", permission: PERMISSIONS.ORDER.VIEW, Component: OrderDetailPage },
    { path: "order/detail/:id/cancel-with-refund", permission: PERMISSIONS.REFUND.PROCESS, Component: OrderCancelWithRefundPage },
    { path: "refunds/list", permission: PERMISSIONS.REFUND.VIEW, Component: RefundListPage },
    { path: "refunds/detail/:id", permission: PERMISSIONS.REFUND.VIEW, Component: RefundDetailPage },
    { path: "refunds/create", permission: PERMISSIONS.REFUND.PROCESS, Component: RefundCreatePage },
    { path: "prize-payouts/list", permission: PERMISSIONS.PRIZE_PAYOUT.VIEW, Component: PrizePayoutListPage },
    { path: "prize-payouts/detail/:id", permission: PERMISSIONS.PRIZE_PAYOUT.VIEW, Component: PrizePayoutDetailPage },
    { path: "support-tickets/list", permission: PERMISSIONS.SUPPORT_TICKET.VIEW, Component: SupportTicketListPage },
    { path: "support-tickets/detail/:id", permission: PERMISSIONS.SUPPORT_TICKET.VIEW, Component: SupportTicketDetailPage },
    { path: "support-tickets/categories", permission: PERMISSIONS.SUPPORT_TICKET.VIEW, Component: TicketCategoryListPage },
    { path: "dashboard/settings/*", permission: PERMISSIONS.SETTINGS.VIEW, Component: SettingsPage },
    { path: "settings/system-config/list", permission: PERMISSIONS.SETTINGS.VIEW, Component: SystemConfigListPage },
    { path: "chat", permission: PERMISSIONS.CHAT.VIEW, Component: ChatPage },
    { path: "review", Component: ReviewListPage },
    { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
];

export function renderAdminRouteElement(route?: AdminRouteItem | null) {
  if (!route) return null;
  if (route.element) return route.element;
  const Component = route.Component;
  if (!Component) return null;

  if (route.permissions || route.permission) {
    return (
      <PermissionGuard permission={route.permission} permissions={route.permissions}>
        <Component />
      </PermissionGuard>
    );
  }
  return <Component />;
}

export const AdminAuthRoutes = [
    { path: "auth/login", Component: LoginPage },
    { path: "auth/forgot-password", Component: ForgotPasswordPage },
];

export const CommonRoutes = [
    { path: "setup-profile", Component: ProfileSetupPage },
    { path: "auth/callback", Component: OAuthCallbackPage },
];
