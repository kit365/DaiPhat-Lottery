"use client";

import React, { lazy } from 'react';

const ShiftListPage = lazy(() => import('@/admin/pages/hr/ShiftListPage').then(m => ({ default: m.ShiftListPage })));

export default function AdminShiftListRoute() {
  return <ShiftListPage />;
}
