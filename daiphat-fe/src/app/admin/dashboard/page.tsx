"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const DashboardPage = lazy(() => import('@/admin/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));

export default function AdminDashboardRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}>
      <DashboardPage />
    </PermissionGuard>
  );
}
