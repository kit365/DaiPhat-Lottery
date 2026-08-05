"use client";

import { ImportBatchDetailPage } from '@/admin/features/ticket/import-batch/components/pages/ImportBatchDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ImportBatchDetailPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.TICKET.CREATE],
});
