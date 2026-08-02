"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StationEditPage = lazy(() => import('@/admin/features/station/components/pages/StationEditPage').then(m => ({ default: m.StationEditPage })));

export default function AdminProviderEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PROVIDER.EDIT}>
      <StationEditPage />
    </PermissionGuard>
  );
}
