"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupportTicketListPage = lazy(() => import('@/admin/features/support-ticket/components/pages/SupportTicketListPage').then(m => ({ default: m.SupportTicketListPage })));

export default function AdminSupportTicketListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPORT_TICKET.VIEW}>
      <SupportTicketListPage />
    </PermissionGuard>
  );
}
