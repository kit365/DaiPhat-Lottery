import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { OrdersTab } from '@/client/features/profile/pages/tabs/OrdersTab';

export default function ProfileOrdersPage() {
  return <ProfileTabWrapper content={<OrdersTab />} />;
}
