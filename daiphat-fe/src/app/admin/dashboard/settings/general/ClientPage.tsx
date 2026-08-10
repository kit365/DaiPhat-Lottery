"use client";

import { GeneralSettingsPage } from '@/admin/pages/settings/GeneralSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: GeneralSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
