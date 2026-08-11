"use client";

import { ForgotPasswordPage } from '@/admin/features/auth/components/pages/ForgotPasswordPage';
import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
    component: ForgotPasswordPage,
});
