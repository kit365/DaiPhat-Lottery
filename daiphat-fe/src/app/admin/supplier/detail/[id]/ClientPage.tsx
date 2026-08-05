"use client";

import { SupplierDetailPage } from '@/admin/features/supplier/components/pages/SupplierDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierDetailPage,
  permission: PERMISSIONS.SUPPLIER.VIEW,
});
