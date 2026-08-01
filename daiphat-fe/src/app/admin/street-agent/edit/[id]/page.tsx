"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StreetAgentEditPage = lazy(() => import('@/admin/features/street-agent/components/pages/StreetAgentEditPage').then(m => ({ default: m.StreetAgentEditPage })));

export default function AdminStreetAgentEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.STREET_AGENT.EDIT}>
      <StreetAgentEditPage />
    </PermissionGuard>
  );
}
