"use client";

import { ClientCreatePage } from '@/admin/features/users/components/pages/ClientCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ClientCreatePage,
  permission: PERMISSIONS.USER.CREATE,
});
