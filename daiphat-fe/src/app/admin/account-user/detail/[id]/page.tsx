"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ClientDetailPage = lazy(() => import('@/admin/features/users/components/pages/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })));

export default function AdminAccountUserDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.USER.VIEW}>
      <ClientDetailPage />
    </PermissionGuard>
  );
}
