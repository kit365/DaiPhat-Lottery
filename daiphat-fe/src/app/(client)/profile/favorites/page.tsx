import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { FavoritesTab } from '@/client/features/profile/pages/tabs/FavoritesTab';

export default function ProfileFavoritesPage() {
  return <ProfileTabWrapper content={<FavoritesTab />} />;
}
