"use client";

import { ClientChangePasswordPage } from '@/admin/features/users/components/pages/ClientChangePasswordPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ClientChangePasswordPage,
  permission: PERMISSIONS.USER.EDIT,
});
