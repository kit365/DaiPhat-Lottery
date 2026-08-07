"use client";

import { NotificationListPage } from '@/admin/features/notifications/components/pages/NotificationListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: NotificationListPage,
  permission: PERMISSIONS.NOTIFICATION.VIEW,
});
