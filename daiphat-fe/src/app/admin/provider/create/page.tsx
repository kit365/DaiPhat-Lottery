"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StationCreatePage = lazy(() => import('@/admin/features/station/components/pages/StationCreatePage').then(m => ({ default: m.StationCreatePage })));

export default function AdminProviderCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PROVIDER.CREATE}>
      <StationCreatePage />
    </PermissionGuard>
  );
}
