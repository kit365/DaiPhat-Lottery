import { ProfileTabWrapper } from '../ProfileTabWrapper';
import { BankAccountsTab } from '@/client/features/profile/pages/tabs/BankAccountsTab';

export default function ProfileBankAccountsPage() {
  return <ProfileTabWrapper content={<BankAccountsTab />} />;
}
