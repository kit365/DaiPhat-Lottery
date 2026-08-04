"use client";

import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfileDashboardPage } from '@/client/features/profile/pages/ProfileDashboardPage';

export function ProfileV2Client() {
  return (
    <PrivateRoute>
      <ProfileDashboardPage />
    </PrivateRoute>
  );
}
