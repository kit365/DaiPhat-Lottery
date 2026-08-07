"use client";

import { ReturnBatchInspectPage } from '@/admin/features/ticket/return-batch/components/pages/ReturnBatchInspectPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ReturnBatchInspectPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.SUPPLIER.VIEW],
});
