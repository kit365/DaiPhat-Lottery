"use client";

import { CounterOrderCreatePage } from '@/admin/features/orders/components/pages/CounterOrderCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: CounterOrderCreatePage,
  permission: PERMISSIONS.ORDER.CREATE,
});
