"use client";

import { GeneralStatisticsPage } from '@/admin/pages/dashboard/statistics/GeneralStatisticsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: GeneralStatisticsPage,
  permission: PERMISSIONS.STATISTICS.REVENUE,
});
