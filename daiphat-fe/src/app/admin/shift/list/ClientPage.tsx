"use client";

import { ShiftListPage } from '@/admin/features/hr/components/pages/ShiftListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: ShiftListPage,
  
});
