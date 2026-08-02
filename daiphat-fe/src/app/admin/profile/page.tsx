"use client";

import React, { lazy } from 'react';

const ProfilePage = lazy(() => import('@/admin/features/users/components/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

export default function AdminProfileRoute() {
  return <ProfilePage />;
}
