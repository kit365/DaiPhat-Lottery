"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupplierEditPage = lazy(() => import('@/admin/features/supplier/components/pages/SupplierEditPage').then(m => ({ default: m.SupplierEditPage })));

export default function AdminSupplierEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPLIER.EDIT}>
      <SupplierEditPage />
    </PermissionGuard>
  );
}
