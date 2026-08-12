import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { NotificationsTab } from '@/client/features/profile/pages/tabs/NotificationsTab';

export default function ProfileNotificationsPage() {
  return <ProfileTabWrapper content={<NotificationsTab />} />;
}
