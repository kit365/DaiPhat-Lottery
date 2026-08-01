"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ChatPage = lazy(() => import('@/admin/features/chat/components/pages/ChatPage').then(m => ({ default: m.ChatPage })));

export default function AdminChatRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.CHAT.VIEW}>
      <ChatPage />
    </PermissionGuard>
  );
}
