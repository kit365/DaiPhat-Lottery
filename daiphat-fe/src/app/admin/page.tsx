import { redirect } from 'next/navigation';
import { ROUTES } from '@/admin/constants/routes';

export default function AdminRootPage() {
  redirect(ROUTES.ADMIN.DASHBOARD.ECOMMERCE);
}
