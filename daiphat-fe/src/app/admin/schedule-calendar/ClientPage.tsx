"use client";

import { ScheduleCalendarPage } from '@/admin/pages/hr/ScheduleCalendarPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';

export const ClientPage = createAdminClientPage({
  component: ScheduleCalendarPage,
  
});
