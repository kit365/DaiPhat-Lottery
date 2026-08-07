"use client";

import { SupplierSettlementListPage } from '@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierSettlementListPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW],
});
