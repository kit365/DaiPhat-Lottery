"use client";

import { ClientListPage } from '@/admin/features/users/components/pages/ClientListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ClientListPage,
  permission: PERMISSIONS.USER.VIEW,
});
