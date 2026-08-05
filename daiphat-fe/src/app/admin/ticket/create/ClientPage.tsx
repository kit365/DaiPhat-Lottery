"use client";

import { TicketCreatePage } from '@/admin/features/ticket/inventory/components/pages/TicketCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: TicketCreatePage,
  permissions: [PERMISSIONS.TICKET.CREATE, PERMISSIONS.TICKET.VIEW, PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.IMPORT_BATCH.CREATE],
});
