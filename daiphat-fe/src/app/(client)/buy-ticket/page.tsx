import { Suspense } from 'react';
import { BuyTicketPage } from '@/client/features/buy-ticket/BuyTicketPage';

export const dynamic = 'force-dynamic';

export default function BuyTicket() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <BuyTicketPage />
    </Suspense>
  );
}
