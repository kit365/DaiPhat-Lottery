"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AdminCreatePage = lazy(() => import('@/admin/features/users/components/pages/AdminCreatePage').then(m => ({ default: m.AdminCreatePage })));

export default function AdminAccountAdminCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.CREATE}>
      <AdminCreatePage />
    </PermissionGuard>
  );
}
