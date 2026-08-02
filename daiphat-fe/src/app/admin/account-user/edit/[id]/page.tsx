"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ClientEditPage = lazy(() => import('@/admin/features/users/components/pages/ClientEditPage').then(m => ({ default: m.ClientEditPage })));

export default function AdminAccountUserEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.USER.EDIT}>
      <ClientEditPage />
    </PermissionGuard>
  );
}
