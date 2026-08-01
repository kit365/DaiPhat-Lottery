"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ReturnBatchEditPage = lazy(() => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchEditPage').then(m => ({ default: m.ReturnBatchEditPage })));

export default function AdminReturnBatchEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
      <ReturnBatchEditPage />
    </PermissionGuard>
  );
}
