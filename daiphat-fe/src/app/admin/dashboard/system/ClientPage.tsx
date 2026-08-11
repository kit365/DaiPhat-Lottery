"use client";

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  loader: () => import('@/admin/features/dashboard/components/pages/SystemPage'),
  exportName: 'SystemPage',
  permission: PERMISSIONS.DASHBOARD.SYSTEM,
});
