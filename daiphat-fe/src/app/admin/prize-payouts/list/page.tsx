"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const PrizePayoutListPage = lazy(() => import('@/admin/pages/prize-payout/PrizePayoutListPage').then(m => ({ default: m.PrizePayoutListPage })));

export default function AdminPrizePayoutListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PRIZE_PAYOUT.VIEW}>
      <PrizePayoutListPage />
    </PermissionGuard>
  );
}
