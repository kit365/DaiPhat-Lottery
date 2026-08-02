"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const RefundDetailPage = lazy(() => import('@/admin/pages/refund/RefundDetailPage').then(m => ({ default: m.RefundDetailPage })));

export default function AdminRefundDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}>
      <RefundDetailPage />
    </PermissionGuard>
  );
}
