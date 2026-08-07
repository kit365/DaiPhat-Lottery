"use client";

import { ExpiredTicketListPage } from '@/admin/features/ticket/inventory/components/pages/ExpiredTicketListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ExpiredTicketListPage,
  permission: PERMISSIONS.TICKET.VIEW,
});
