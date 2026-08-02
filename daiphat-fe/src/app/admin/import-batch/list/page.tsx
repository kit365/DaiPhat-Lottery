"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ImportBatchListPage = lazy(() => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchListPage').then(m => ({ default: m.ImportBatchListPage })));

export default function AdminImportBatchListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.VIEW}>
      <ImportBatchListPage />
    </PermissionGuard>
  );
}
