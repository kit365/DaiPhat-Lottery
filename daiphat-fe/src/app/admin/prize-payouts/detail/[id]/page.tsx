"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const PrizePayoutDetailPage = lazy(() => import('@/admin/pages/prize-payout/PrizePayoutDetailPage').then(m => ({ default: m.PrizePayoutDetailPage })));

export default function AdminPrizePayoutDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PRIZE_PAYOUT.VIEW}>
      <PrizePayoutDetailPage />
    </PermissionGuard>
  );
}
