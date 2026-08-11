"use client";

import { ReviewListPage } from '@/admin/features/review/components/pages/ReviewListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ReviewListPage,
  permission: PERMISSIONS.REVIEW.VIEW,
});
