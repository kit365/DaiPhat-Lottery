"use client";

import { ShiftListPage } from '@/admin/pages/hr/ShiftListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: ShiftListPage,
  
});
