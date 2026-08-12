"use client";

import { ImportBatchEditPage } from '@/admin/features/ticket/import-batch/components/pages/ImportBatchEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ImportBatchEditPage,
  permission: PERMISSIONS.IMPORT_BATCH.CREATE,
});
