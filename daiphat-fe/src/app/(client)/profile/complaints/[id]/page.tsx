import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { ComplaintDetailTab } from '@/client/features/profile/pages/tabs/ComplaintDetailTab';

export default function ProfileComplaintDetailPage() {
  return <ProfileTabWrapper content={<ComplaintDetailTab />} />;
}
