import { AdminRouteGuardWrapper } from '@/admin/components/auth/AdminRouteGuardWrapper';
import '@/admin/styles/index.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
      <AdminRouteGuardWrapper>
        {children}
      </AdminRouteGuardWrapper>
    </div>
  );
}


