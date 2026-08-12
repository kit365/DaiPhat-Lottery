"use client";

import { StaffStatisticsPage } from '@/admin/features/dashboard/components/statistics/StaffStatisticsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StaffStatisticsPage,
  permission: PERMISSIONS.ACCOUNT.VIEW,
});
