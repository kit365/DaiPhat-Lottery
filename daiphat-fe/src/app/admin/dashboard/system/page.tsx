"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SystemPage = lazy(() => import('@/admin/pages/dashboard/SystemPage').then(m => ({ default: m.SystemPage })));

export default function AdminSystemRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.DASHBOARD.SYSTEM}>
      <SystemPage />
    </PermissionGuard>
  );
}
