"use client";

import { StreetAgentListPage } from '@/admin/features/street-agent/components/pages/StreetAgentListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StreetAgentListPage,
  permission: PERMISSIONS.STREET_AGENT.VIEW,
});
