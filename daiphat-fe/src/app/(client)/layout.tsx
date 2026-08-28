import { Suspense } from 'react';
import { Header } from '@/client/components/layout/header';
import { Footer } from '@/client/components/layout/Footer';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';
import { ClientHeaderGuard } from '@/client/components/layout/ClientHeaderGuard';
import { ClientGlobalWidgets } from '@/client/components/layout/ClientGlobalWidgets';
import { PendingPaymentReminderBanner } from '@/client/components/payment/PendingPaymentReminderBanner';
import { SiteBrandingHead } from '@/client/components/layout/SiteBrandingHead';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
      <div className="client-theme min-h-screen text-inherit font-inherit flex flex-col relative">
        <SiteBrandingHead />
        <ClientHeaderGuard>
          <Header />
        </ClientHeaderGuard>
        <PendingPaymentReminderBanner />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer />
        <ClientGlobalWidgets />
      </div>
    </Suspense>
  );
}


