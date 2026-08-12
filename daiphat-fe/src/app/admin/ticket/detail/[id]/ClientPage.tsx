"use client";

import { TicketDetailPage } from '@/admin/features/ticket/inventory/components/pages/TicketDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: TicketDetailPage,
  permission: PERMISSIONS.TICKET.VIEW,
});
