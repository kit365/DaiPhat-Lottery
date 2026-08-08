import { use } from 'react';
import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { OrderDetailTab } from '@/client/features/profile/pages/tabs/OrderDetailTab';

export default function ProfileOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ProfileTabWrapper content={<OrderDetailTab />} params={resolvedParams} />;
}
