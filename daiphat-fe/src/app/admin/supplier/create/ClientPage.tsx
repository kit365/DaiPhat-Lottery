"use client";

import { SupplierCreatePage } from '@/admin/features/supplier/components/pages/SupplierCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierCreatePage,
  permission: PERMISSIONS.SUPPLIER.CREATE,
});
