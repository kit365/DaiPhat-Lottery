"use client";

import EcommercePage from '@/admin/features/dashboard/components/pages/EcommercePage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: EcommercePage,
  permission: PERMISSIONS.DASHBOARD.ECOMMERCE,
});
