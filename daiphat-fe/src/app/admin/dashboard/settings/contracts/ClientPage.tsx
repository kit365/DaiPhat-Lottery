"use client";

import { ContractsSettingsPage } from '@/admin/features/settings/components/pages/ContractsSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ContractsSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
