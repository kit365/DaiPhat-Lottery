"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const DrawResultPage = lazy(() => import('@/admin/features/draw-result/components/pages/DrawResultPage').then(m => ({ default: m.DrawResultPage })));

export default function AdminDrawResultRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.LOTTERY_RESULT.VIEW}>
      <DrawResultPage />
    </PermissionGuard>
  );
}
