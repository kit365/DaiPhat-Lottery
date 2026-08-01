"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const PrizeStructureListPage = lazy(() => import('@/admin/features/prize-structure/components/pages/PrizeStructureListPage').then(m => ({ default: m.PrizeStructureListPage })));

export default function AdminPrizeStructureListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.PRIZE_STRUCTURE.VIEW}>
      <PrizeStructureListPage />
    </PermissionGuard>
  );
}
