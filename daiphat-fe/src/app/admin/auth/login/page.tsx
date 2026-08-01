"use client";

import { GuestGuard } from '@/admin/components/auth/GuestGuard';
import { LoginPage } from '@/admin/routes';

export default function AdminLogin() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}
