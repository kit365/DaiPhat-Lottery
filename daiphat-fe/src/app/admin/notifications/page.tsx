"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const NotificationListPage = lazy(() => import('@/admin/features/notifications/components/pages/NotificationListPage').then(m => ({ default: m.NotificationListPage })));

export default function AdminNotificationListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.NOTIFICATION.VIEW}>
      <NotificationListPage />
    </PermissionGuard>
  );
}
