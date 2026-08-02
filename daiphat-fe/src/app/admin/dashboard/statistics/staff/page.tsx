"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StaffStatisticsPage = lazy(() => import('@/admin/pages/dashboard/statistics/StaffStatisticsPage').then(m => ({ default: m.StaffStatisticsPage })));

export default function AdminStaffStatisticsRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ACCOUNT.VIEW}>
      <StaffStatisticsPage />
    </PermissionGuard>
  );
}
