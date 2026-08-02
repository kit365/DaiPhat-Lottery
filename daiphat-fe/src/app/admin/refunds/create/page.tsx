"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const RefundCreatePage = lazy(() => import('@/admin/pages/refund/RefundCreatePage').then(m => ({ default: m.RefundCreatePage })));

export default function AdminRefundCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REFUND.PROCESS}>
      <RefundCreatePage />
    </PermissionGuard>
  );
}
