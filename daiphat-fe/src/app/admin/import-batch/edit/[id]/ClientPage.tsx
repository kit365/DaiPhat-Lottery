"use client";

import { useEffect } from 'react';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useRouteParams } from '@/hooks/useRouteParams';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { ROUTES } from '@/admin/constants/routes';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

/** Legacy /edit/:id bookmarks → detail (edit form lives on detail when editable). */
const ImportBatchEditRedirectPage = () => {
  const { id } = useRouteParams();
  const router = useAdminRouter();

  useEffect(() => {
    if (!id) {
      return;
    }
    router.replace(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(id));
  }, [id, router]);

  return <SpinnerLoading message="Đang chuyển tới phiếu nhập lô..." minHeight={360} />;
};

export const ClientPage = createAdminClientPage({
  component: ImportBatchEditRedirectPage,
  permission: PERMISSIONS.IMPORT_BATCH.CREATE,
});
