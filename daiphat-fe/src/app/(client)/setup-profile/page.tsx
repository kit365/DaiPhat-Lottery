import { ProfileSetupPage } from '@/admin/routes';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';

export default function SetupProfile() {
  return (
    <AuthGuard>
      <ProfileSetupPage />
    </AuthGuard>
  );
}
