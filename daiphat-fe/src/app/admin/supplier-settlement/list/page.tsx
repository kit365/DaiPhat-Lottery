"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierSettlementListPage = lazy(() => import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage').then(m => ({ default: m.SupplierSettlementListPage })));

export default function AdminSupplierSettlementListRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW]}>
      <SupplierSettlementListPage />
    </PermissionGuard>
  );
}
