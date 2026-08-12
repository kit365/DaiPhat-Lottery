"use client";

import { ChatPage } from '@/admin/features/chat/components/pages/ChatPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ChatPage,
  permission: PERMISSIONS.CHAT.VIEW,
});
