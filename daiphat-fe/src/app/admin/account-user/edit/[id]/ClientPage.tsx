"use client";

import { ClientEditPage } from '@/admin/features/users/components/pages/ClientEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ClientEditPage,
  permission: PERMISSIONS.USER.EDIT,
});
