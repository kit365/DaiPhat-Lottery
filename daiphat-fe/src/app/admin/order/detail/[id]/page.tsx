"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const OrderDetailPage = lazy(() => import('@/admin/features/orders/components/pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));

export default function AdminOrderDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}>
      <OrderDetailPage />
    </PermissionGuard>
  );
}
