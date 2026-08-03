"use client";

import dynamic from 'next/dynamic';

const ChatbotPopup = dynamic(
  () => import('@/client/components/support/ChatbotPopup').then((mod) => mod.ChatbotPopup),
  { ssr: false }
);

const AuthModalContainer = dynamic(
  () => import('@/client/components/auth/AuthModalContainer').then((mod) => mod.AuthModalContainer),
  { ssr: false }
);

export function ClientGlobalWidgets() {
  return (
    <>
      <ChatbotPopup />
      <AuthModalContainer />
    </>
  );
}
