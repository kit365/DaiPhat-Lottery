"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const ReviewListPage = lazy(() => import('@/admin/pages/review/ReviewListPage').then(m => ({ default: m.ReviewListPage })));

export default function AdminReviewRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.REVIEW.VIEW}>
      <ReviewListPage />
    </PermissionGuard>
  );
}
