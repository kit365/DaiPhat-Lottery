"use client";

import { SupplierEditPage } from '@/admin/features/supplier/components/pages/SupplierEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierEditPage,
  permission: PERMISSIONS.SUPPLIER.EDIT,
});
