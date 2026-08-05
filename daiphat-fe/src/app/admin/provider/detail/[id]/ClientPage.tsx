"use client";

import { StationDetailPage } from '@/admin/features/station/components/pages/StationDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StationDetailPage,
  permission: PERMISSIONS.PROVIDER.VIEW,
});
