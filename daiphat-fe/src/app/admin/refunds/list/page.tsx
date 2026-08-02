"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const RefundListPage = lazy(() => import('@/admin/pages/refund/RefundListPage').then(m => ({ default: m.RefundListPage })));

export default function AdminRefundListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REFUND.VIEW}>
      <RefundListPage />
    </PermissionGuard>
  );
}
