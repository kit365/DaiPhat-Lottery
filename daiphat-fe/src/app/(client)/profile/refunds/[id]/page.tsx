import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { RefundDetailTab } from '@/client/features/profile/pages/tabs/RefundDetailTab';

export default function ProfileRefundDetailPage() {
  return <ProfileTabWrapper content={<RefundDetailTab />} />;
}
