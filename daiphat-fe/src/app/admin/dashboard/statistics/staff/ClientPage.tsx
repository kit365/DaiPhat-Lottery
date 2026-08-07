"use client";

import { StaffStatisticsPage } from '@/admin/pages/dashboard/statistics/StaffStatisticsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StaffStatisticsPage,
  permission: PERMISSIONS.ACCOUNT.VIEW,
});
