"use client";

import AnalyticsPage from '@/admin/features/dashboard/components/pages/AnalyticsPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AnalyticsPage,
  permission: PERMISSIONS.DASHBOARD.ANALYTICS,
});
