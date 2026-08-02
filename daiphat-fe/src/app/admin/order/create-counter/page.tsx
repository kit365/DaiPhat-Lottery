"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const CounterOrderCreatePage = lazy(() => import('@/admin/features/orders/components/pages/CounterOrderCreatePage').then(m => ({ default: m.CounterOrderCreatePage })));

export default function AdminCounterOrderCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ORDER.CREATE}>
      <CounterOrderCreatePage />
    </PermissionGuard>
  );
}
