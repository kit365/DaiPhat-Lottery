"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ExpiredTicketListPage = lazy(() => import('@/admin/features/ticket/inventory/components/pages/ExpiredTicketListPage').then(m => ({ default: m.ExpiredTicketListPage })));

export default function AdminExpiredTicketListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.TICKET.VIEW}>
      <ExpiredTicketListPage />
    </PermissionGuard>
  );
}
