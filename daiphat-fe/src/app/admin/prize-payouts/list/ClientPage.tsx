"use client";

import { PrizePayoutListPage } from '@/admin/pages/prize-payout/PrizePayoutListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PrizePayoutListPage,
  permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
});
