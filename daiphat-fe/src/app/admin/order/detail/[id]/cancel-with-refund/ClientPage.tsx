"use client";

import { OrderCancelWithRefundPage } from '@/admin/features/refund/components/pages/OrderCancelWithRefundPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: OrderCancelWithRefundPage,
  permission: PERMISSIONS.REFUND.PROCESS,
});
