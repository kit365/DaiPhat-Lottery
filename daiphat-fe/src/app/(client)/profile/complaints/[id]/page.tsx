import { use } from 'react';
import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { ComplaintDetailTab } from '@/client/features/profile/pages/tabs/ComplaintDetailTab';

export default function ProfileComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ProfileTabWrapper content={<ComplaintDetailTab />} params={resolvedParams} />;
}
