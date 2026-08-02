"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AdminEditPage = lazy(() => import('@/admin/features/users/components/pages/AdminEditPage').then(m => ({ default: m.AdminEditPage })));

export default function AdminAccountAdminEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}>
      <AdminEditPage />
    </PermissionGuard>
  );
}
