"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ReturnBatchListPage = lazy(() => import('@/admin/features/ticket/return-batch/components/pages/ReturnBatchListPage').then(m => ({ default: m.ReturnBatchListPage })));

export default function AdminReturnBatchListRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW]}>
      <ReturnBatchListPage />
    </PermissionGuard>
  );
}
