"use client";

import { SettingsPage } from '@/admin/pages/settings/SettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
