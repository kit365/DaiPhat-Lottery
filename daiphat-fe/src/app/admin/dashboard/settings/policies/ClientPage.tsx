"use client";

import { PoliciesSettingsPage } from '@/admin/features/settings/components/pages/PoliciesSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: PoliciesSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
