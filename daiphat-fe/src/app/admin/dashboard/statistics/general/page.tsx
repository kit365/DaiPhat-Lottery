"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const GeneralStatisticsPage = lazy(() => import('@/admin/pages/dashboard/statistics/GeneralStatisticsPage').then(m => ({ default: m.GeneralStatisticsPage })));

export default function AdminGeneralStatisticsRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.STATISTICS.REVENUE}>
      <GeneralStatisticsPage />
    </PermissionGuard>
  );
}
