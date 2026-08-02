"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AdminChangePasswordPage = lazy(() => import('@/admin/features/users/components/pages/AdminChangePasswordPage').then(m => ({ default: m.AdminChangePasswordPage })));

export default function AdminAccountAdminChangePasswordRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.EDIT}>
      <AdminChangePasswordPage />
    </PermissionGuard>
  );
}
