"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const TicketEditPage = lazy(() => import('@/admin/features/ticket/inventory/components/pages/TicketEditPage').then(m => ({ default: m.TicketEditPage })));

export default function AdminTicketEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.TICKET.EDIT}>
      <TicketEditPage />
    </PermissionGuard>
  );
}
