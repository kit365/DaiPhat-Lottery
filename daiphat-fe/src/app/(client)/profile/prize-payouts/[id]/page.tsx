import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { PrizePayoutDetailTab } from '@/client/features/profile/pages/tabs/PrizePayoutDetailTab';

export default function ProfilePrizePayoutDetailPage() {
  return <ProfileTabWrapper content={<PrizePayoutDetailTab />} />;
}
