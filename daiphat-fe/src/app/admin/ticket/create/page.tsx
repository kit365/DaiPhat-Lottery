"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const TicketCreatePage = lazy(() => import('@/admin/features/ticket/inventory/components/pages/TicketCreatePage').then(m => ({ default: m.TicketCreatePage })));

export default function AdminTicketCreateRoute() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.TICKET.VIEW, PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE]}>
      <TicketCreatePage />
    </PermissionGuard>
  );
}
