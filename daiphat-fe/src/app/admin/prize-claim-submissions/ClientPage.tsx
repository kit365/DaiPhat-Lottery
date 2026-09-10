"use client";

import { PrizeClaimSubmissionListPage } from '@/admin/features/prize-claim-submission/components/pages/PrizeClaimSubmissionListPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PrizeClaimSubmissionListPage,
  permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
});
