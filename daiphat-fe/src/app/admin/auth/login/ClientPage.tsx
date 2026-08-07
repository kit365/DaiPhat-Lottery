"use client";

import { LoginPage } from '@/admin/pages/authen/LoginPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
    component: LoginPage,
});
