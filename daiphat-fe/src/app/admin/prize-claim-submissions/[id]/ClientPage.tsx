"use client";

import { PrizeClaimSubmissionDetailPage } from '@/admin/features/prize-claim-submission/components/pages/PrizeClaimSubmissionDetailPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PrizeClaimSubmissionDetailPage,
  permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
});
