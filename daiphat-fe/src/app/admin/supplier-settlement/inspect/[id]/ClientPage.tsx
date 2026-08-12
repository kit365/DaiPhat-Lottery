"use client";

import { SupplierSettlementInspectPage } from '@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementInspectPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: SupplierSettlementInspectPage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW],
});
