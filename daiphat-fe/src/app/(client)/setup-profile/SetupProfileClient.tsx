"use client";

import { ProfileSetupPage } from '@/admin/features/auth/components/pages/ProfileSetupPage';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';

export function SetupProfileClient() {
  return (
    <AuthGuard>
      <ProfileSetupPage />
    </AuthGuard>
  );
}
