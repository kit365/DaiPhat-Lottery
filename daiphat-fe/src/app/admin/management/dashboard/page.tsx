import { redirect } from 'next/navigation';

/** Legacy bookmark path → current App Router dashboard. */
export default function LegacyManagementDashboardRedirect() {
  redirect('/admin/dashboard');
}
