"use client";

import { TicketEditPage } from '@/admin/features/ticket/inventory/components/pages/TicketEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: TicketEditPage,
  permission: PERMISSIONS.TICKET.EDIT,
});
