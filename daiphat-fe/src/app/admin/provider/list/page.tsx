"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StationListPage = lazy(() => import('@/admin/features/station/components/pages/StationListPage').then(m => ({ default: m.StationListPage })));

export default function AdminProviderListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}>
      <StationListPage />
    </PermissionGuard>
  );
}
