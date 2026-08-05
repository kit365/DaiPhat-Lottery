"use client";

import { RefundCreatePage } from '@/admin/pages/refund/RefundCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: RefundCreatePage,
  permission: PERMISSIONS.REFUND.PROCESS,
});
