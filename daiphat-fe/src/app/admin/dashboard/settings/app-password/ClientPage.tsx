"use client";

import { AppPasswordSettingsPage } from '@/admin/pages/settings/AppPasswordSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AppPasswordSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
