"use client";

import { ReturnBatchListPage } from '@/admin/features/ticket/return-batch/components/pages/ReturnBatchListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ReturnBatchListPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW],
});
