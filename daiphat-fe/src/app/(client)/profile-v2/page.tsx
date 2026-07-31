"use client";

import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfileDashboardPage } from '@/client/features/profile/pages/ProfileDashboardPage';

export default function ProfileV2() {
  return (
    <PrivateRoute>
      <ProfileDashboardPage />
    </PrivateRoute>
  );
}
