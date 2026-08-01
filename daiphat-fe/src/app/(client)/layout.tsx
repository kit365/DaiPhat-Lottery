"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '@/client/components/layout/Footer';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

const ChatbotPopup = dynamic(
  () => import('@/client/components/support/ChatbotPopup').then((mod) => mod.ChatbotPopup),
  { ssr: false }
);

const AuthModalContainer = dynamic(
  () => import('@/client/components/auth/AuthModalContainer').then((mod) => mod.AuthModalContainer),
  { ssr: false }
);

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
      <AuthModalContainer />
    </div>
  );
}
