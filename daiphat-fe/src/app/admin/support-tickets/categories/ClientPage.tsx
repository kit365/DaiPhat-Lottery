"use client";

import { TicketCategoryListPage } from '@/admin/features/support-ticket/components/pages/TicketCategoryListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: TicketCategoryListPage,
  permission: PERMISSIONS.SUPPORT_TICKET.VIEW,
});
