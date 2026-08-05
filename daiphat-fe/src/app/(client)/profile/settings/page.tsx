import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { SecurityTab } from '@/client/features/profile/pages/tabs/SecurityTab';

export default function ProfileSettingsPage() {
  return <ProfileTabWrapper content={<SecurityTab />} />;
}
