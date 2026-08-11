"use client";

import { LoginPage } from '@/admin/features/auth/components/pages/LoginPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
    component: LoginPage,
});
