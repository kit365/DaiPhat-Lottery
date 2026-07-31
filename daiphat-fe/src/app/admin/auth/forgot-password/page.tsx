"use client";

import { GuestGuard } from '@/admin/components/auth/GuestGuard';
import { ForgotPasswordPage } from '@/admin/routes';

export default function AdminForgotPassword() {
  return (
    <GuestGuard>
      <ForgotPasswordPage />
    </GuestGuard>
  );
}
