"use client";

import { ForgotPasswordPage } from '@/admin/pages/authen/ForgotPasswordPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
    component: ForgotPasswordPage,
});
