"use client";

import React, { lazy } from 'react';

const ScheduleCalendarPage = lazy(() => import('@/admin/pages/hr/ScheduleCalendarPage').then(m => ({ default: m.ScheduleCalendarPage })));

export default function AdminScheduleCalendarRoute() {
  return <ScheduleCalendarPage />;
}
