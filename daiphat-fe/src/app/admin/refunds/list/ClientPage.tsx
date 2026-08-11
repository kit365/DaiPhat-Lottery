"use client";

import { RefundListPage } from '@/admin/features/refund/components/pages/RefundListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: RefundListPage,
  permission: PERMISSIONS.REFUND.VIEW,
});
