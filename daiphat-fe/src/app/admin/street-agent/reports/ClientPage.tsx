"use client";

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
    loader: () => import('@/admin/features/street-agent/components/pages/StreetAgentReportPage'),
    exportName: 'StreetAgentReportPage',
    permission: PERMISSIONS.DASHBOARD.ANALYTICS,
});
