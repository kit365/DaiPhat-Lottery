"use client";

import { AdminEditPage } from '@/admin/features/users/components/pages/AdminEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AdminEditPage,
  permission: PERMISSIONS.ACCOUNT.EDIT,
});
