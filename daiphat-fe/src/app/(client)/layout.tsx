"use client";

import { Suspense } from 'react';
import { Footer } from '@/client/components/layout/Footer';
import { ChatbotPopup } from '@/client/components/support/ChatbotPopup';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-theme min-h-screen text-inherit font-inherit flex flex-col relative">
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          {children}
        </Suspense>
      </div>
      <Footer />
      <ChatbotPopup />
    </div>
  );
}
