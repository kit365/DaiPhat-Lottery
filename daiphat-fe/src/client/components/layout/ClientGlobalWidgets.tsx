"use client";

import dynamic from 'next/dynamic';

import { ChatbotEntry } from '@/client/components/support/ChatbotEntry';

const AuthModalContainer = dynamic(
  () => import('@/client/components/auth/AuthModalContainer').then((mod) => mod.AuthModalContainer),
  { ssr: false }
);

export function ClientGlobalWidgets() {
  return (
    <>
      <ChatbotEntry />
      <AuthModalContainer />
    </>
  );
}
