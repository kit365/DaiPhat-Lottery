import { ProfileTabWrapper } from '../../ProfileTabWrapper';
import { OrderDetailTab } from '@/client/features/profile/pages/tabs/OrderDetailTab';

export default function ProfileOrderDetailPage() {
  return <ProfileTabWrapper content={<OrderDetailTab />} />;
}
