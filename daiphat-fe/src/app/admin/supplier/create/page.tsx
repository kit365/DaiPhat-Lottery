"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierCreatePage = lazy(() => import('@/admin/features/supplier/components/pages/SupplierCreatePage').then(m => ({ default: m.SupplierCreatePage })));

export default function AdminSupplierCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPLIER.CREATE}>
      <SupplierCreatePage />
    </PermissionGuard>
  );
}
