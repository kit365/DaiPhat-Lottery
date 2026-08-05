"use client";

import { SystemPage } from '@/admin/pages/dashboard/SystemPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SystemPage,
  permission: PERMISSIONS.DASHBOARD.SYSTEM,
});
