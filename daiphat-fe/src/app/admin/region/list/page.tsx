"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const RegionListPage = lazy(() => import('@/admin/features/region/components/pages/RegionListPage').then(m => ({ default: m.RegionListPage })));

export default function AdminRegionListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REGION.VIEW}>
      <RegionListPage />
    </PermissionGuard>
  );
}
