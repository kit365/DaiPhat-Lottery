import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { TicketsTab } from '@/client/features/profile/pages/tabs/TicketsTab';

export default function ProfileTicketsPage() {
  return <ProfileTabWrapper content={<TicketsTab />} />;
}
