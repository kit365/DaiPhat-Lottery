"use client";

import React, { lazy } from 'react';
import { AdminNavigationComplete } from '@/admin/components/navigation/AdminNavigationComplete';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const PrizeClaimSubmissionCreatePage = lazy(() =>
  import('@/admin/features/prize-claim-submission/components/pages/PrizeClaimSubmissionCreatePage').then((m) => ({
    default: m.PrizeClaimSubmissionCreatePage,
  }))
);

export default function AdminPrizeClaimSubmissionCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
      <AdminNavigationComplete />
      <PrizeClaimSubmissionCreatePage />
    </PermissionGuard>
  );
}
