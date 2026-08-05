"use client";

import { DepartmentListPage } from '@/admin/pages/hr/DepartmentListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: DepartmentListPage,
  
});
