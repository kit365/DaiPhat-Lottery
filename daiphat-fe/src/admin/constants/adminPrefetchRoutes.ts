"use client";

import { ROUTES } from './routes';
import { registerAdminPageChunkLoader } from '../lib/adminPagePrefetchRegistry';

<<<<<<< HEAD
/**
 * Small, stable set of high-traffic destinations warmed after the admin shell
 * becomes idle. Keep this list intentionally short; sidebar hover handles the
 * remaining routes on demand.
 */
export const ADMIN_PREFETCH_ROUTE_PRIORITY = [
    ROUTES.ADMIN.DASHBOARD.ROOT,
    ROUTES.ADMIN.TICKETS.LIST,
    ROUTES.ADMIN.ORDERS.LIST,
    ROUTES.ADMIN.IMPORT_BATCH.LIST,
] as const;

=======
>>>>>>> 7736d5a3 ([DP-8] fix: remove idle admin prefetch hook.)
/** Map route → dynamic import chunk, dùng khi hover sidebar / sau login. */
const registerAdminPageChunkLoaders = () => {
    const loaders: Array<[string, () => Promise<unknown>]> = [
        [ROUTES.ADMIN.TICKETS.LIST, () => import('@/admin/features/ticket/inventory/components/pages/TicketListPage')],
        [ROUTES.ADMIN.TICKETS.PROVIDER, () => import('@/admin/features/station/components/pages/StationListPage')],
        [ROUTES.ADMIN.TICKETS.EXPIRED, () => import('@/admin/features/ticket/inventory/components/pages/ExpiredTicketListPage')],
        [ROUTES.ADMIN.TICKETS.DRAW_RESULT, () => import('@/admin/features/draw-result/components/pages/DrawResultPage')],
        [ROUTES.ADMIN.TICKETS.PRIZE_STRUCTURE, () => import('@/admin/features/prize-structure/components/pages/PrizeStructureListPage')],
        [ROUTES.ADMIN.TICKETS.REGION, () => import('@/admin/features/region/components/pages/RegionListPage')],
        [ROUTES.ADMIN.ORDERS.LIST, () => import('@/admin/features/orders/components/pages/OrderListPage')],
        [ROUTES.ADMIN.ORDERS.CREATE_COUNTER, () => import('@/admin/features/orders/components/pages/CounterOrderCreatePage')],
        [ROUTES.ADMIN.CHAT, () => import('@/admin/features/chat/components/pages/ChatPage')],
        [ROUTES.ADMIN.REFUNDS.LIST, () => import('@/admin/features/refund/components/pages/RefundListPage')],
        [ROUTES.ADMIN.PRIZE_PAYOUTS.LIST, () => import('@/admin/features/prize-payout/components/pages/PrizePayoutListPage')],
        [ROUTES.ADMIN.SUPPORT_TICKETS.LIST, () => import('@/admin/features/support-ticket/components/pages/SupportTicketListPage')],
        [ROUTES.ADMIN.SUPPORT_TICKETS.CATEGORIES, () => import('@/admin/features/support-ticket/components/pages/TicketCategoryListPage')],
        [ROUTES.ADMIN.IMPORT_BATCH.LIST, () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchListPage')],
        [ROUTES.ADMIN.IMPORT_BATCH.CREATE, () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchCreatePage')],
        [ROUTES.ADMIN.RETURN_BATCH.LIST, () => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchListPage')],
        [ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST, () => import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage')],
        [ROUTES.ADMIN.SUPPLIER.LIST, () => import('@/admin/features/supplier/components/pages/SupplierListPage')],
        [ROUTES.ADMIN.DASHBOARD.ROOT, () => import('@/admin/features/dashboard/components/pages/DashboardPage')],
        [ROUTES.ADMIN.DASHBOARD.SYSTEM, () => import('@/admin/features/dashboard/components/pages/SystemPage')],
        [ROUTES.ADMIN.DASHBOARD.ECOMMERCE, () => import('@/admin/features/dashboard/components/pages/EcommercePage')],
        [ROUTES.ADMIN.DASHBOARD.ANALYTICS, () => import('@/admin/features/dashboard/components/pages/AnalyticsPage')],
        [ROUTES.ADMIN.BLOGS.LIST, () => import('@/admin/features/blogs/components/pages/BlogListPage')],
        [ROUTES.ADMIN.BLOGS.CATEGORIES, () => import('@/admin/features/blogs/components/pages/BlogCategoryListPage')],
        [ROUTES.ADMIN.BLOGS.TAGS, () => import('@/admin/features/blogs/components/pages/BlogTagListPage')],
        [ROUTES.ADMIN.ACCOUNTS.USER.LIST, () => import('@/admin/features/users/components/pages/ClientListPage')],
        [ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST, () => import('@/admin/features/users/components/pages/AdminListPage')],
        [ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST, () => import('@/admin/features/street-agent/components/pages/StreetAgentListPage')],
        [ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION, () => import('@/admin/features/street-agent/components/pages/VendorAllocationPage')],
        [ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES, () => import('@/admin/features/street-agent/components/pages/VendorAllocationBatchListPage')],
        [ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LUCKY_PATTERNS, () => import('@/admin/features/street-agent/components/pages/LuckyPatternConfigPage')],
        [ROUTES.ADMIN.ROLES.LIST, () => import('@/admin/features/role/components/pages/RoleListPage')],
        [ROUTES.ADMIN.REVIEWS, () => import('@/admin/features/review/components/pages/ReviewListPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.SYSTEM_CONFIG, () => import('@/admin/features/system-config/components/pages/SystemConfigListPage')],
        [ROUTES.ADMIN.NOTIFICATIONS, () => import('@/admin/features/notifications/components/pages/NotificationListPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL, () => import('@/admin/features/settings/components/pages/GeneralSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.POLICIES, () => import('@/admin/features/settings/components/pages/PoliciesSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.PAGES, () => import('@/admin/features/settings/components/pages/ContentSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.APP_PASSWORD, () => import('@/admin/features/settings/components/pages/AppPasswordSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.STATISTICS.GENERAL, () => import('@/admin/features/dashboard/components/statistics/GeneralStatisticsPage')],
        [ROUTES.ADMIN.DASHBOARD.STATISTICS.ORDERS, () => import('@/admin/features/dashboard/components/statistics/OrderStatisticsPage')],
        ['/admin/dashboard/statistics/staff', () => import('@/admin/features/dashboard/components/statistics/StaffStatisticsPage')],
        [ROUTES.ADMIN.PROFILE, () => import('@/admin/features/users/components/pages/ProfilePage')],
        ['/admin/department/list', () => import('@/admin/features/hr/components/pages/DepartmentListPage')],
        ['/admin/shift/list', () => import('@/admin/features/hr/components/pages/ShiftListPage')],
        ['/admin/schedule-calendar', () => import('@/admin/features/hr/components/pages/ScheduleCalendarPage')],
    ];

    loaders.forEach(([path, loader]) => registerAdminPageChunkLoader(path, loader));
};

registerAdminPageChunkLoaders();
