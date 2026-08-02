"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ClientChangePasswordPage = lazy(() => import('@/admin/features/users/components/pages/ClientChangePasswordPage').then(m => ({ default: m.ClientChangePasswordPage })));

export default function AdminAccountUserChangePasswordRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.USER.EDIT}>
      <ClientChangePasswordPage />
    </PermissionGuard>
  );
}
