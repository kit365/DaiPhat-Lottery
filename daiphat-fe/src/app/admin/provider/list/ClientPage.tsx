"use client";

import { StationListPage } from '@/admin/features/station/components/pages/StationListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StationListPage,
  permission: PERMISSIONS.PROVIDER.VIEW,
});
