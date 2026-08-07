"use client";

import { StationEditPage } from '@/admin/features/station/components/pages/StationEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StationEditPage,
  permission: PERMISSIONS.PROVIDER.EDIT,
});
