import { use } from 'react';
import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfilePage as ClientProfilePage } from '@/client/features/profile/pages/ProfilePage';
import { OverviewTab } from '@/client/features/profile/pages/tabs/OverviewTab';
import { ProfileInfoTab } from '@/client/features/profile/pages/tabs/ProfileInfoTab';
import { TicketsTab } from '@/client/features/profile/pages/tabs/TicketsTab';
import { OrdersTab } from '@/client/features/profile/pages/tabs/OrdersTab';
import { OrderDetailTab } from '@/client/features/profile/pages/tabs/OrderDetailTab';
import { FavoritesTab } from '@/client/features/profile/pages/tabs/FavoritesTab';
import { NotificationsTab } from '@/client/features/profile/pages/tabs/NotificationsTab';
import { ResultNotificationSettingsTab } from '@/client/features/profile/pages/tabs/ResultNotificationSettingsTab';
import { SecurityTab } from '@/client/features/profile/pages/tabs/SecurityTab';
import { RefundsTab } from '@/client/features/profile/pages/tabs/RefundsTab';
import { PrizePayoutsTab } from '@/client/features/profile/pages/tabs/PrizePayoutsTab';
import { PrizePayoutDetailTab } from '@/client/features/profile/pages/tabs/PrizePayoutDetailTab';
import { RefundDetailTab } from '@/client/features/profile/pages/tabs/RefundDetailTab';
import { BankAccountsTab } from '@/client/features/profile/pages/tabs/BankAccountsTab';
import { ComplaintsTab } from '@/client/features/profile/pages/tabs/ComplaintsTab';
import { ComplaintDetailTab } from '@/client/features/profile/pages/tabs/ComplaintDetailTab';
import { OutletProvider } from '@/components/router-compat';

export default function ProfileTabRoute({ params }: { params: Promise<{ tab?: string[] }> }) {
  const resolvedParams = use(params);
  const tabSegments = resolvedParams.tab || ['overview'];
  const first = tabSegments[0];
  const second = tabSegments[1];

  let tabContent = <OverviewTab />;

  if (first === 'info') tabContent = <ProfileInfoTab />;
  else if (first === 'tickets') tabContent = <TicketsTab />;
  else if (first === 'orders') {
    tabContent = second ? <OrderDetailTab /> : <OrdersTab />;
  } else if (first === 'refunds') {
    tabContent = second ? <RefundDetailTab /> : <RefundsTab />;
  } else if (first === 'prize-payouts') {
    tabContent = second ? <PrizePayoutDetailTab /> : <PrizePayoutsTab />;
  } else if (first === 'complaints') {
    tabContent = second ? <ComplaintDetailTab /> : <ComplaintsTab />;
  } else if (first === 'bank-accounts') tabContent = <BankAccountsTab />;
  else if (first === 'favorites') tabContent = <FavoritesTab />;
  else if (first === 'notifications') tabContent = <NotificationsTab />;
  else if (first === 'result-notifications') tabContent = <ResultNotificationSettingsTab />;
  else if (first === 'settings') tabContent = <SecurityTab />;

  return (
    <PrivateRoute>
      <OutletProvider outlet={tabContent}>
        <ClientProfilePage />
      </OutletProvider>
    </PrivateRoute>
  );
}
