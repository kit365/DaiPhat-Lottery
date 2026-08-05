"use client";

import { DrawResultPage } from '@/admin/features/draw-result/components/pages/DrawResultPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: DrawResultPage,
  permission: PERMISSIONS.LOTTERY_RESULT.VIEW,
});
