"use client";

import { DashboardPage } from '@/admin/pages/dashboard/DashboardPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: DashboardPage,
  permission: PERMISSIONS.DASHBOARD.ANALYTICS,
});
