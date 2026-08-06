import { AdminRouteGuardWrapper } from '@/admin/components/auth/AdminRouteGuardWrapper';
import { SiteBrandingHead } from '@/client/components/layout/SiteBrandingHead';
import '@/admin/styles/index.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
      <SiteBrandingHead />
      <AdminRouteGuardWrapper>
        {children}
      </AdminRouteGuardWrapper>
    </div>
  );
}


