"use client";

import { AdminCreatePage } from '@/admin/features/users/components/pages/AdminCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AdminCreatePage,
  permission: PERMISSIONS.ACCOUNT.CREATE,
});
