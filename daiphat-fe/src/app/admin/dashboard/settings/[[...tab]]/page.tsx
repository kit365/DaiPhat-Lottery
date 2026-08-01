"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SettingsPage = lazy(() => import('@/admin/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

export default function AdminSettingsRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SETTINGS.VIEW}>
      <SettingsPage />
    </PermissionGuard>
  );
}
