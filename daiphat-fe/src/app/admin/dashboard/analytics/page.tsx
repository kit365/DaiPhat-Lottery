"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const AnalyticsPage = lazy(() => import('@/admin/pages/dashboard/AnalyticsPage'));

export default function AdminAnalyticsRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.DASHBOARD.ANALYTICS}>
      <AnalyticsPage />
    </PermissionGuard>
  );
}
