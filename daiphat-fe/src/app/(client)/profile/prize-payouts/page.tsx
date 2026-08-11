import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { PrizePayoutsTab } from '@/client/features/profile/pages/tabs/PrizePayoutsTab';

export default function ProfilePrizePayoutsPage() {
  return <ProfileTabWrapper content={<PrizePayoutsTab />} />;
}
