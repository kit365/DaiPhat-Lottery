"use client";

import { SupportTicketListPage } from '@/admin/features/support-ticket/components/pages/SupportTicketListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupportTicketListPage,
  permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
});
