"use client";

import { TicketListPage } from '@/admin/features/ticket/inventory/components/pages/TicketListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: TicketListPage,
  permission: PERMISSIONS.TICKET.VIEW,
});
