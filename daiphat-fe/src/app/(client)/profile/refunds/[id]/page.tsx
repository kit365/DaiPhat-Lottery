import { use } from 'react';
import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { RefundDetailTab } from '@/client/features/profile/pages/tabs/RefundDetailTab';

export default function ProfileRefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ProfileTabWrapper content={<RefundDetailTab />} params={resolvedParams} />;
}
