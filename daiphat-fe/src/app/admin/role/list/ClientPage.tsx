"use client";

import { RoleListPage } from '@/admin/features/role/components/pages/RoleListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: RoleListPage,
  permission: PERMISSIONS.ROLE.VIEW,
});
