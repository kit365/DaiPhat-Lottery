"use client";

import { StreetAgentCreatePage } from '@/admin/features/street-agent/components/pages/StreetAgentCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: StreetAgentCreatePage,
  permission: PERMISSIONS.STREET_AGENT.CREATE,
});
