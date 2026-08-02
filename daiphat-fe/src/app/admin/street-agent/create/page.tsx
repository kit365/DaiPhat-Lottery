"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const StreetAgentCreatePage = lazy(() => import('@/admin/features/street-agent/components/pages/StreetAgentCreatePage').then(m => ({ default: m.StreetAgentCreatePage })));

export default function AdminStreetAgentCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.STREET_AGENT.CREATE}>
      <StreetAgentCreatePage />
    </PermissionGuard>
  );
}
