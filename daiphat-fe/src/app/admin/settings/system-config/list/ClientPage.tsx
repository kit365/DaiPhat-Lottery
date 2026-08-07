"use client";

import { SystemConfigListPage } from '@/admin/features/system-config/components/pages/SystemConfigListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SystemConfigListPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
