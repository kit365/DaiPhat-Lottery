"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const TicketDetailPage = lazy(() => import('@/admin/features/ticket/inventory/components/pages/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));

export default function AdminTicketDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}>
      <TicketDetailPage />
    </PermissionGuard>
  );
}
