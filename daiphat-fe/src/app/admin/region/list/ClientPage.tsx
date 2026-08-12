"use client";

import { RegionListPage } from '@/admin/features/region/components/pages/RegionListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: RegionListPage,
  permission: PERMISSIONS.REGION.VIEW,
});
