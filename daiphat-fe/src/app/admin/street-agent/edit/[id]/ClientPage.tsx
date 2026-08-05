"use client";

import { StreetAgentEditPage } from '@/admin/features/street-agent/components/pages/StreetAgentEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StreetAgentEditPage,
  permission: PERMISSIONS.STREET_AGENT.EDIT,
});
