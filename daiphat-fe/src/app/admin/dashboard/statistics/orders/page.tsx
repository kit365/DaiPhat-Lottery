"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const OrderStatisticsPage = lazy(() => import('@/admin/pages/dashboard/statistics/OrderStatisticsPage').then(m => ({ default: m.OrderStatisticsPage })));

export default function AdminOrderStatisticsRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.STATISTICS.ORDER}>
      <OrderStatisticsPage />
    </PermissionGuard>
  );
}
