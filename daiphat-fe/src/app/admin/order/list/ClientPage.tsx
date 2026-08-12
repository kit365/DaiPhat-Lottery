"use client";

import { OrderListPage } from '@/admin/features/orders/components/pages/OrderListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: OrderListPage,
  permission: PERMISSIONS.ORDER.VIEW,
});
