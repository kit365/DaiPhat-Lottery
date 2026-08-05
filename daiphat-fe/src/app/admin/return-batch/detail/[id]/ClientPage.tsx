"use client";

import { ReturnBatchDetailPage } from '@/admin/features/ticket/return-batch/components/pages/ReturnBatchDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ReturnBatchDetailPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.SUPPLIER.VIEW],
});
