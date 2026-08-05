"use client";

import { SupplierListPage } from '@/admin/features/supplier/components/pages/SupplierListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierListPage,
  permission: PERMISSIONS.SUPPLIER.VIEW,
});
