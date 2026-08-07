"use client";

import { ProfileSetupPage } from '@/admin/pages/authen/ProfileSetupPage';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';

export function SetupProfileClient() {
  return (
    <AuthGuard>
      <ProfileSetupPage />
    </AuthGuard>
  );
}
