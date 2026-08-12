import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { RefundsTab } from '@/client/features/profile/pages/tabs/RefundsTab';

export default function ProfileRefundsPage() {
  return <ProfileTabWrapper content={<RefundsTab />} />;
}
