"use client";

import { ClientDetailPage } from '@/admin/features/users/components/pages/ClientDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ClientDetailPage,
  permission: PERMISSIONS.USER.VIEW,
});
