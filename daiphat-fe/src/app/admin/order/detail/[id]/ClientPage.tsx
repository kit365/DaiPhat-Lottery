"use client";

import { OrderDetailPage } from '@/admin/features/orders/components/pages/OrderDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: OrderDetailPage,
  permission: PERMISSIONS.ORDER.VIEW,
});
