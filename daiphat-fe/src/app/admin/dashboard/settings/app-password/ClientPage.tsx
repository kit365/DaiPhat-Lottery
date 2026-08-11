"use client";

import { AppPasswordSettingsPage } from '@/admin/features/settings/components/pages/AppPasswordSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AppPasswordSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
