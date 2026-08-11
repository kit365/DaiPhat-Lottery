"use client";

import { ContentSettingsPage } from '@/admin/features/settings/components/pages/ContentSettingsPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ContentSettingsPage,
  permission: PERMISSIONS.SETTINGS.VIEW,
});
