import { redirect } from 'next/navigation';
import { ROUTES } from '@/admin/constants/routes';

export default function AdminDashboardRoute() {
  redirect(ROUTES.ADMIN.DASHBOARD.ECOMMERCE);
}
