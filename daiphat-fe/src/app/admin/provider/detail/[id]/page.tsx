"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StationDetailPage = lazy(() => import('@/admin/features/station/components/pages/StationDetailPage').then(m => ({ default: m.StationDetailPage })));

export default function AdminProviderDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PROVIDER.VIEW}>
      <StationDetailPage />
    </PermissionGuard>
  );
}
