"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ClientListPage = lazy(() => import('@/admin/features/users/components/pages/ClientListPage').then(m => ({ default: m.ClientListPage })));

export default function AdminAccountUserListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.USER.VIEW}>
      <ClientListPage />
    </PermissionGuard>
  );
}
