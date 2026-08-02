"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierSettlementDetailPage = lazy(() => import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementDetailPage').then(m => ({ default: m.SupplierSettlementDetailPage })));

export default function AdminSupplierSettlementDetailRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW]}>
      <SupplierSettlementDetailPage />
    </PermissionGuard>
  );
}
