import type { Metadata } from 'next';

import { AdminRouteGuardWrapper } from '@/admin/components/auth/AdminRouteGuardWrapper';
import { AdminSiteBrandingHead } from '@/admin/components/layout/AdminSiteBrandingHead';
import '@/admin/styles/index.css';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
      <AdminSiteBrandingHead />
      <AdminRouteGuardWrapper>
        {children}
      </AdminRouteGuardWrapper>
    </div>
  );
}


