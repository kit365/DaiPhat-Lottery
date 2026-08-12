import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { ResultNotificationSettingsTab } from '@/client/features/profile/pages/tabs/ResultNotificationSettingsTab';

export default function ProfileResultNotificationsPage() {
  return <ProfileTabWrapper content={<ResultNotificationSettingsTab />} />;
}
