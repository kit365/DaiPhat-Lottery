"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const TicketCategoryListPage = lazy(() => import('@/admin/features/support-ticket/components/pages/TicketCategoryListPage').then(m => ({ default: m.TicketCategoryListPage })));

export default function AdminTicketCategoryListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.SUPPORT_TICKET.VIEW}>
      <TicketCategoryListPage />
    </PermissionGuard>
  );
}
