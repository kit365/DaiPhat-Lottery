"use client";

import dynamic from 'next/dynamic';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';

const FeaturePage = dynamic(
  () =>
    import('@/admin/features/ticket/supplier-settlement/components/pages/SupplierSettlementInspectPage').then(
      (module) => module.SupplierSettlementInspectPage
    ),
  {
    ssr: false,
    loading: () => <SpinnerLoading message="Đang tải trang kiểm tra đối soát..." minHeight={360} />,
  }
);

export const ClientPage = createAdminClientPage({
  component: FeaturePage,
  permissions: [PERMISSIONS.IMPORT_BATCH.VIEW, PERMISSIONS.SUPPLIER.VIEW],
});
