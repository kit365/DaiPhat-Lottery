"use client";

import { Suspense, type ReactNode } from 'react';

import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfilePage } from '@/client/features/profile/pages/ProfilePage';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

export function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <ProfilePage>{children}</ProfilePage>
      </Suspense>
    </PrivateRoute>
  );
}
