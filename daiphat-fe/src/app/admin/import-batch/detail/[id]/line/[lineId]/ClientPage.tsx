"use client";

import { ImportBatchLineDetailPage } from '@/admin/features/ticket/import-batch/components/pages/ImportBatchLineDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ImportBatchLineDetailPage,
  permission: PERMISSIONS.IMPORT_BATCH.VIEW,
});
