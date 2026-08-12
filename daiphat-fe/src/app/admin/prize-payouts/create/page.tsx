"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const PrizePayoutCreatePage = lazy(() =>
  import('@/admin/features/prize-payout/components/pages/PrizePayoutCreatePage').then((m) => ({
    default: m.PrizePayoutCreatePage,
  }))
);

export default function AdminPrizePayoutCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
      <PrizePayoutCreatePage />
    </PermissionGuard>
  );
}
