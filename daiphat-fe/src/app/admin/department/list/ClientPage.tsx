"use client";

import { DepartmentListPage } from '@/admin/features/hr/components/pages/DepartmentListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: DepartmentListPage,
  
});
