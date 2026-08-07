"use client";

import { ReviewListPage } from '@/admin/pages/review/ReviewListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: ReviewListPage,
  permission: PERMISSIONS.REVIEW.VIEW,
});
