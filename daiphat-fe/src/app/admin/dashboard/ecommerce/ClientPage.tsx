"use client";

import EcommercePage from '@/admin/pages/dashboard/EcommercePage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: EcommercePage,
  permission: PERMISSIONS.DASHBOARD.ECOMMERCE,
});
