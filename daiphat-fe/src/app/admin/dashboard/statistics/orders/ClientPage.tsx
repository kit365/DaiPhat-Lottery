"use client";

import { OrderStatisticsPage } from '@/admin/pages/dashboard/statistics/OrderStatisticsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: OrderStatisticsPage,
  permission: PERMISSIONS.STATISTICS.ORDER,
});
