"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const TicketListPage = lazy(() => import('@/admin/features/ticket/inventory/components/pages/TicketListPage').then(m => ({ default: m.TicketListPage })));

export default function AdminTicketListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}>
      <TicketListPage />
    </PermissionGuard>
  );
}
