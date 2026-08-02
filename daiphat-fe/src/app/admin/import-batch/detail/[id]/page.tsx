"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ImportBatchDetailPage = lazy(() => import('@/admin/features/ticket/import-batch/components/pages/ImportBatchDetailPage').then(m => ({ default: m.ImportBatchDetailPage })));

export default function AdminImportBatchDetailRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.TICKET.CREATE]}>
      <ImportBatchDetailPage />
    </PermissionGuard>
  );
}
