"use client";

import { StationCreatePage } from '@/admin/features/station/components/pages/StationCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StationCreatePage,
  permission: PERMISSIONS.PROVIDER.CREATE,
});
