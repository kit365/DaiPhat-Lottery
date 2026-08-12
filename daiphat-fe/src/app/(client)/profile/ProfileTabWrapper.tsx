"use client";

import React from 'react';

interface ProfileTabWrapperProps {
  content: React.ReactNode;
  params?: Record<string, string>;
}

/**
 * Profile shell (sidebar + PrivateRoute) lives in profile/layout → ProfileLayout.
 * This wrapper only injects tab content (route params come from Next.js App Router).
 */
export function ProfileTabWrapper({ content }: ProfileTabWrapperProps) {
  return <>{content}</>;
}
