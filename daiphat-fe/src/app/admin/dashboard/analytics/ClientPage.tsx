"use client";

import AnalyticsPage from '@/admin/pages/dashboard/AnalyticsPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AnalyticsPage,
  permission: PERMISSIONS.DASHBOARD.ANALYTICS,
});
