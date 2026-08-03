import { GuestGuard } from '@/admin/components/auth/GuestGuard';
import { LoginPage } from '@/admin/pages/authen/LoginPage';

export default function AdminLogin() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}

