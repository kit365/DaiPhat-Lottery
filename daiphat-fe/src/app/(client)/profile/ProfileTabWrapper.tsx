"use client";

import React, { Suspense } from 'react';
import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfilePage as ClientProfilePage } from '@/client/features/profile/pages/ProfilePage';
import { OutletProvider } from '@/components/router-compat';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

interface ProfileTabWrapperProps {
  content: React.ReactNode;
  params?: Record<string, string>;
}

export function ProfileTabWrapper({ content, params }: ProfileTabWrapperProps) {
  return (
    <PrivateRoute>
      <OutletProvider outlet={content} params={params}>
        <Suspense fallback={<LoadingSpinner />}>
          <ClientProfilePage />
        </Suspense>
      </OutletProvider>
    </PrivateRoute>
  );
}
