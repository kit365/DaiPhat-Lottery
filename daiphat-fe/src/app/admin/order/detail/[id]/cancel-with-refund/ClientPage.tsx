"use client";

import { OrderCancelWithRefundPage } from '@/admin/features/refund/components/pages/OrderCancelWithRefundPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: OrderCancelWithRefundPage,
  permissions: [PERMISSIONS.REFUND.PROCESS, PERMISSIONS.ORDER.EDIT, PERMISSIONS.ORDER.VIEW],
});
