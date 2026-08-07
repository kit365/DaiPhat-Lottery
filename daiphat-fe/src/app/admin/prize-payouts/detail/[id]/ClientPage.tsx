"use client";

import { PrizePayoutDetailPage } from '@/admin/pages/prize-payout/PrizePayoutDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PrizePayoutDetailPage,
  permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
});
