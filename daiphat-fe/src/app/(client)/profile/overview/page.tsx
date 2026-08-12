import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { OverviewTab } from '@/client/features/profile/pages/tabs/OverviewTab';

export default function ProfileOverviewPage() {
  return <ProfileTabWrapper content={<OverviewTab />} />;
}
