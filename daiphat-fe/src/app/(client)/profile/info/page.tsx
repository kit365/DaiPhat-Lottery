import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { ProfileInfoTab } from '@/client/features/profile/pages/tabs/ProfileInfoTab';

export default function ProfileInfoPage() {
  return <ProfileTabWrapper content={<ProfileInfoTab />} />;
}
