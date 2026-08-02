"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const SupportTicketDetailPage = lazy(() => import('@/admin/features/support-ticket/components/pages/SupportTicketDetailPage').then(m => ({ default: m.SupportTicketDetailPage })));

export default function AdminSupportTicketDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPORT_TICKET.VIEW}>
      <SupportTicketDetailPage />
    </PermissionGuard>
  );
}
