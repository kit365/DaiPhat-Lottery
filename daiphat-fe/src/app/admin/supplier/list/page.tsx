"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierListPage = lazy(() => import('@/admin/features/supplier/components/pages/SupplierListPage').then(m => ({ default: m.SupplierListPage })));

export default function AdminSupplierListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPLIER.VIEW}>
      <SupplierListPage />
    </PermissionGuard>
  );
}
