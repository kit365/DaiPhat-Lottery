import { ROUTES } from './routes';
import { menuDevelopmentData, menuManagementData, menuOverviewData } from './sideBar';
import { registerAdminPageChunkLoader } from '../lib/adminPagePrefetchRegistry';

type SidebarItem = {
    path?: string;
    children?: { path?: string }[];
};

const collectSidebarPaths = (items: SidebarItem[]): string[] => {
    const paths: string[] = [];

    items.forEach((item) => {
        if (item.path) {
            paths.push(item.path);
        }
        item.children?.forEach((child) => {
            if (child.path) {
                paths.push(child.path);
            }
        });
    });

    return paths;
};

/** Tất cả route tĩnh trong sidebar admin — dùng cho prefetch toàn bộ. */
export const ADMIN_PREFETCH_ALL_ROUTES = Array.from(
    new Set([
        ...collectSidebarPaths(menuOverviewData),
        ...collectSidebarPaths(menuManagementData),
        ...collectSidebarPaths(menuDevelopmentData),
        ROUTES.ADMIN.DASHBOARD.ANALYTICS,
        ROUTES.ADMIN.DASHBOARD.STATISTICS.GENERAL,
        ROUTES.ADMIN.DASHBOARD.STATISTICS.ORDERS,
        ROUTES.ADMIN.TICKETS.EXPIRED,
        ROUTES.ADMIN.TICKETS.DRAW_RESULT,
        ROUTES.ADMIN.TICKETS.PRIZE_STRUCTURE,
        ROUTES.ADMIN.TICKETS.REGION,
        ROUTES.ADMIN.TICKETS.PROVIDER,
        ROUTES.ADMIN.NOTIFICATIONS,
        ROUTES.ADMIN.PROFILE,
        ROUTES.ADMIN.REVIEWS,
        ROUTES.ADMIN.DASHBOARD.SETTINGS.SYSTEM_CONFIG,
        '/admin/department/list',
        '/admin/shift/list',
        '/admin/schedule-calendar',
        '/admin/dashboard/statistics/staff',
    ]),
);

/** Các trang admin hay mở nhất — prefetch ngay khi shell load. */
export const ADMIN_PREFETCH_ROUTE_PRIORITY = [
    ROUTES.ADMIN.DASHBOARD.ROOT,
    ROUTES.ADMIN.TICKETS.LIST,
    ROUTES.ADMIN.ORDERS.LIST,
    ROUTES.ADMIN.IMPORT_BATCH.LIST,
    ROUTES.ADMIN.IMPORT_BATCH.CREATE,
    ROUTES.ADMIN.TICKETS.PROVIDER,
    ROUTES.ADMIN.SUPPLIER.LIST,
    ROUTES.ADMIN.CHAT,
    ROUTES.ADMIN.REFUNDS.LIST,
    ROUTES.ADMIN.PRIZE_PAYOUTS.LIST,
    ROUTES.ADMIN.SUPPORT_TICKETS.LIST,
    ROUTES.ADMIN.RETURN_BATCH.LIST,
    ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST,
    ROUTES.ADMIN.DASHBOARD.SYSTEM,
    ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
    ROUTES.ADMIN.BLOGS.LIST,
    ROUTES.ADMIN.ACCOUNTS.USER.LIST,
    ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST,
    ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST,
    ROUTES.ADMIN.ROLES.LIST,
] as const;

const registerPriorityChunkLoaders = () => {
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
        [ROUTES.ADMIN.REFUNDS.LIST, () => import('@/admin/pages/refund/RefundListPage')],
        [ROUTES.ADMIN.PRIZE_PAYOUTS.LIST, () => import('@/admin/pages/prize-payout/PrizePayoutListPage')],
        [ROUTES.ADMIN.SUPPORT_TICKETS.LIST, () => import('@/admin/features/support-ticket/components/pages/SupportTicketListPage')],
        [ROUTES.ADMIN.SUPPORT_TICKETS.CATEGORIES, () => import('@/admin/features/support-ticket/components/pages/TicketCategoryListPage')],
        [ROUTES.ADMIN.IMPORT_BATCH.LIST, () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchListPage')],
        [ROUTES.ADMIN.IMPORT_BATCH.CREATE, () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchCreatePage')],
        [ROUTES.ADMIN.RETURN_BATCH.LIST, () => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchListPage')],
        [ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST, () => import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage')],
        [ROUTES.ADMIN.SUPPLIER.LIST, () => import('@/admin/features/supplier/components/pages/SupplierListPage')],
        [ROUTES.ADMIN.DASHBOARD.ROOT, () => import('@/admin/pages/dashboard/DashboardPage')],
        [ROUTES.ADMIN.DASHBOARD.SYSTEM, () => import('@/admin/pages/dashboard/SystemPage')],
        [ROUTES.ADMIN.DASHBOARD.ECOMMERCE, () => import('@/admin/pages/dashboard/EcommercePage')],
        [ROUTES.ADMIN.DASHBOARD.ANALYTICS, () => import('@/admin/pages/dashboard/AnalyticsPage')],
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
        [ROUTES.ADMIN.REVIEWS, () => import('@/admin/pages/review/ReviewListPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.SYSTEM_CONFIG, () => import('@/admin/features/system-config/components/pages/SystemConfigListPage')],
        [ROUTES.ADMIN.NOTIFICATIONS, () => import('@/admin/features/notifications/components/pages/NotificationListPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL, () => import('@/admin/pages/settings/GeneralSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.POLICIES, () => import('@/admin/pages/settings/PoliciesSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.PAGES, () => import('@/admin/pages/settings/ContentSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.SETTINGS.APP_PASSWORD, () => import('@/admin/pages/settings/AppPasswordSettingsPage')],
        [ROUTES.ADMIN.DASHBOARD.STATISTICS.GENERAL, () => import('@/admin/pages/dashboard/statistics/GeneralStatisticsPage')],
        [ROUTES.ADMIN.DASHBOARD.STATISTICS.ORDERS, () => import('@/admin/pages/dashboard/statistics/OrderStatisticsPage')],
        ['/admin/dashboard/statistics/staff', () => import('@/admin/pages/dashboard/statistics/StaffStatisticsPage')],
        [ROUTES.ADMIN.PROFILE, () => import('@/admin/features/users/components/pages/ProfilePage')],
        ['/admin/department/list', () => import('@/admin/pages/hr/DepartmentListPage')],
        ['/admin/shift/list', () => import('@/admin/pages/hr/ShiftListPage')],
        ['/admin/schedule-calendar', () => import('@/admin/pages/hr/ScheduleCalendarPage')],
    ];

    loaders.forEach(([path, loader]) => registerAdminPageChunkLoader(path, loader));
};

registerPriorityChunkLoaders();
