"use client";

import { AdminChangePasswordPage } from '@/admin/features/users/components/pages/AdminChangePasswordPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AdminChangePasswordPage,
  permission: PERMISSIONS.ACCOUNT.EDIT,
});
