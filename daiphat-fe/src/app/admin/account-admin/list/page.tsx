"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AdminListPage = lazy(() => import('@/admin/features/users/components/pages/AdminListPage').then(m => ({ default: m.AdminListPage })));

export default function AdminAccountAdminListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}>
      <AdminListPage />
    </PermissionGuard>
  );
}
