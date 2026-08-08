import { use } from 'react';
import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { PrizePayoutDetailTab } from '@/client/features/profile/pages/tabs/PrizePayoutDetailTab';

export default function ProfilePrizePayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ProfileTabWrapper content={<PrizePayoutDetailTab />} params={resolvedParams} />;
}
