"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ImportBatchLineDetailPage = lazy(() => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchLineDetailPage').then(m => ({ default: m.ImportBatchLineDetailPage })));

export default function AdminImportBatchLineDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.VIEW}>
      <ImportBatchLineDetailPage />
    </PermissionGuard>
  );
}
