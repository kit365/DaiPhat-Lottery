"use client";

import React, { lazy } from 'react';

const DepartmentListPage = lazy(() => import('@/admin/pages/hr/DepartmentListPage').then(m => ({ default: m.DepartmentListPage })));

export default function AdminDepartmentListRoute() {
  return <DepartmentListPage />;
}
