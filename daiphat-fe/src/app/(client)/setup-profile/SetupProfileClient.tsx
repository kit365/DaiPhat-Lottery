"use client";

import { ProfileSetupPage } from '@/admin/routes';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';

export function SetupProfileClient() {
  return (
    <AuthGuard>
      <ProfileSetupPage />
    </AuthGuard>
  );
}
