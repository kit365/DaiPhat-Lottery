"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AdminDetailPage = lazy(() => import('@/admin/features/users/components/pages/AdminDetailPage').then(m => ({ default: m.AdminDetailPage })));

export default function AdminAccountAdminDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}>
      <AdminDetailPage />
    </PermissionGuard>
  );
}
