"use client";

import { RefundDetailPage } from '@/admin/pages/refund/RefundDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: RefundDetailPage,
  permission: PERMISSIONS.REFUND.VIEW,
});
