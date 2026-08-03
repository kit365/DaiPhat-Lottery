import { Suspense } from 'react';
import { TicketSearchPage } from '@/client/pages/ticket-search/TicketSearchPage';

export const dynamic = 'force-dynamic';

export default function TicketSearch() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <TicketSearchPage />
    </Suspense>
  );
}
