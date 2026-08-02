"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ImportBatchCreatePage = lazy(() => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchCreatePage').then(m => ({ default: m.ImportBatchCreatePage })));

export default function AdminImportBatchCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
      <ImportBatchCreatePage />
    </PermissionGuard>
  );
}
