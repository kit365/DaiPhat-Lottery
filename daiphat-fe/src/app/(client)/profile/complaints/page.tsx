import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { ComplaintsTab } from '@/client/features/profile/pages/tabs/ComplaintsTab';

export default function ProfileComplaintsPage() {
  return <ProfileTabWrapper content={<ComplaintsTab />} />;
}
