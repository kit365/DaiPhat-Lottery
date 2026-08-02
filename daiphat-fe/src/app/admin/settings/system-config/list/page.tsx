"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SystemConfigListPage = lazy(() => import('@/admin/features/system-config/components/pages/SystemConfigListPage').then(m => ({ default: m.SystemConfigListPage })));

export default function AdminSystemConfigListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}>
      <SystemConfigListPage />
    </PermissionGuard>
  );
}
