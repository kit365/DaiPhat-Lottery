"use client";

import { ImportBatchCreatePage } from '@/admin/features/ticket/import-batch/components/pages/ImportBatchCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ImportBatchCreatePage,
  permission: PERMISSIONS.IMPORT_BATCH.CREATE,
});
