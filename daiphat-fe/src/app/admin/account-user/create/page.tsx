"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ClientCreatePage = lazy(() => import('@/admin/features/users/components/pages/ClientCreatePage').then(m => ({ default: m.ClientCreatePage })));

export default function AdminAccountUserCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.USER.CREATE}>
      <ClientCreatePage />
    </PermissionGuard>
  );
}
