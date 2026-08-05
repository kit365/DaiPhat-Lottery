"use client";

import { PrizeStructureListPage } from '@/admin/features/prize-structure/components/pages/PrizeStructureListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PrizeStructureListPage,
  permission: PERMISSIONS.PRIZE_STRUCTURE.VIEW,
});
