"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ImportBatchEditPage = lazy(() => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchEditPage').then(m => ({ default: m.ImportBatchEditPage })));

export default function AdminImportBatchEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
      <ImportBatchEditPage />
    </PermissionGuard>
  );
}
