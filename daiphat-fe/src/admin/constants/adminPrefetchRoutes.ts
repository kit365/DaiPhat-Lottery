import { ROUTES } from './routes';
import { registerAdminPageChunkLoader } from '../lib/adminPagePrefetchRegistry';

/** Các trang admin hay mở nhất — prefetch route + JS chunk khi idle / hover sidebar. */
export const ADMIN_PREFETCH_ROUTE_PRIORITY = [
  ROUTES.ADMIN.TICKETS.LIST,
  ROUTES.ADMIN.ORDERS.LIST,
  ROUTES.ADMIN.IMPORT_BATCH.LIST,
  ROUTES.ADMIN.IMPORT_BATCH.CREATE,
  ROUTES.ADMIN.CHAT,
  ROUTES.ADMIN.REFUNDS.LIST,
  ROUTES.ADMIN.PRIZE_PAYOUTS.LIST,
  ROUTES.ADMIN.SUPPORT_TICKETS.LIST,
  ROUTES.ADMIN.RETURN_BATCH.LIST,
  ROUTES.ADMIN.SUPPLIER.LIST,
  ROUTES.ADMIN.DASHBOARD.ROOT,
  ROUTES.ADMIN.DASHBOARD.SYSTEM,
  ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
  ROUTES.ADMIN.BLOGS.LIST,
  ROUTES.ADMIN.ACCOUNTS.USER.LIST,
] as const;

const registerPriorityChunkLoaders = () => {
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.TICKETS.LIST,
    () => import('@/admin/features/ticket/inventory/components/pages/TicketListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.ORDERS.LIST,
    () => import('@/admin/features/orders/components/pages/OrderListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.CHAT,
    () => import('@/admin/features/chat/components/pages/ChatPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.REFUNDS.LIST,
    () => import('@/admin/pages/refund/RefundListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.PRIZE_PAYOUTS.LIST,
    () => import('@/admin/pages/prize-payout/PrizePayoutListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.SUPPORT_TICKETS.LIST,
    () => import('@/admin/features/support-ticket/components/pages/SupportTicketListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.IMPORT_BATCH.LIST,
    () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.IMPORT_BATCH.CREATE,
    () => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchCreatePage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.RETURN_BATCH.LIST,
    () => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.SUPPLIER.LIST,
    () => import('@/admin/features/supplier/components/pages/SupplierListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.DASHBOARD.ROOT,
    () => import('@/admin/pages/dashboard/DashboardPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.DASHBOARD.SYSTEM,
    () => import('@/admin/pages/dashboard/SystemPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
    () => import('@/admin/pages/dashboard/EcommercePage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.BLOGS.LIST,
    () => import('@/admin/features/blogs/components/pages/BlogListPage'),
  );
  registerAdminPageChunkLoader(
    ROUTES.ADMIN.ACCOUNTS.USER.LIST,
    () => import('@/admin/features/users/components/pages/ClientListPage'),
  );
};

registerPriorityChunkLoaders();
