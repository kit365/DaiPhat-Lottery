"use client";

import { ProfilePage } from '@/admin/features/users/components/pages/ProfilePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: ProfilePage,
  
});
