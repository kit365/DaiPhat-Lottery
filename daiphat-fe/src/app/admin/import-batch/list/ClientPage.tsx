"use client";

import { ImportBatchListPage } from '@/admin/features/ticket/import-batch/components/pages/ImportBatchListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ImportBatchListPage,
  permission: PERMISSIONS.IMPORT_BATCH.VIEW,
});
