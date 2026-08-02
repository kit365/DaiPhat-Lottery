"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const OrderListPage = lazy(() => import('@/admin/features/orders/components/pages/OrderListPage').then(m => ({ default: m.OrderListPage })));

export default function AdminOrderListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ORDER.VIEW}>
      <OrderListPage />
    </PermissionGuard>
  );
}
