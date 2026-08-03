"use client";

import dynamic from 'next/dynamic';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

const FeaturePage = dynamic(
  () => import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementListPage').then((m) => m.SupplierSettlementListPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <LoadingSpinner />
      </div>
    ),
  }
);

export function ClientPage() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW]}>
      <FeaturePage />
    </PermissionGuard>
  );
}
