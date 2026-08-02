"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StreetAgentListPage = lazy(() => import('@/admin/features/street-agent/components/pages/StreetAgentListPage').then(m => ({ default: m.StreetAgentListPage })));

export default function AdminStreetAgentListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.STREET_AGENT.VIEW}>
      <StreetAgentListPage />
    </PermissionGuard>
  );
}
