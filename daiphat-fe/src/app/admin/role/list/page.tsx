"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const RoleListPage = lazy(() => import('@/admin/features/role/components/pages/RoleListPage').then(m => ({ default: m.RoleListPage })));

export default function AdminRoleListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ROLE.VIEW}>
      <RoleListPage />
    </PermissionGuard>
  );
}
