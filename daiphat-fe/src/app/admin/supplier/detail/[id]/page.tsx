"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierDetailPage = lazy(() => import('@/admin/features/supplier/components/pages/SupplierDetailPage').then(m => ({ default: m.SupplierDetailPage })));

export default function AdminSupplierDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPLIER.VIEW}>
      <SupplierDetailPage />
    </PermissionGuard>
  );
}
