"use client";

import { SupportTicketDetailPage } from '@/admin/features/support-ticket/components/pages/SupportTicketDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupportTicketDetailPage,
  permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
});
