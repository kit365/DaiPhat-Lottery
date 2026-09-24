import { Suspense } from 'react';
import { ClientPage } from './ClientPage';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';

export default function AdminImportBatchCreateRoute() {
  return (
    <Suspense fallback={<SpinnerLoading message="Đang tải trang..." minHeight={360} />}>
      <ClientPage />
    </Suspense>
  );
}
