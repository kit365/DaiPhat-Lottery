"use client";

import React, { Suspense } from "react";
import { PrivateRoute } from "@/client/features/auth/PrivateRoute";
import { ProfilePage as ClientProfilePage } from "@/client/features/profile/pages/ProfilePage";
import { LoadingSpinner } from "@/client/components/ui/LoadingSpinner";

interface ProfileTabWrapperProps {
  content: React.ReactNode;
}

export function ProfileTabWrapper({ content }: ProfileTabWrapperProps) {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <ClientProfilePage>{content}</ClientProfilePage>
      </Suspense>
    </PrivateRoute>
  );
}
