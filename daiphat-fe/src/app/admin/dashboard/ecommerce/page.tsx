"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const EcommercePage = lazy(() => import('@/admin/pages/dashboard/EcommercePage'));

export default function AdminEcommerceRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.DASHBOARD.ECOMMERCE}>
      <EcommercePage />
    </PermissionGuard>
  );
}
