"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ReturnBatchDetailPage = lazy(() => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchDetailPage').then(m => ({ default: m.ReturnBatchDetailPage })));

export default function AdminReturnBatchDetailRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE, PERMISSIONS.SUPPLIER.VIEW]}>
      <ReturnBatchDetailPage />
    </PermissionGuard>
  );
}
