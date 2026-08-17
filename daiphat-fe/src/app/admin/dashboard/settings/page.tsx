import { redirect } from 'next/navigation';

import { ROUTES } from '@/admin/constants/routes';

export default function AdminSettingsIndexRoute() {
  redirect(ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL);
}
