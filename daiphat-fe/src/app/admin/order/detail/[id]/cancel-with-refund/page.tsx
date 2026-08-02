"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const OrderCancelWithRefundPage = lazy(() => import('@/admin/pages/refund/OrderCancelWithRefundPage').then(m => ({ default: m.OrderCancelWithRefundPage })));

export default function AdminOrderCancelWithRefundRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REFUND.PROCESS}>
      <OrderCancelWithRefundPage />
    </PermissionGuard>
  );
}
