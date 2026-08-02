"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { PrivateRoute } from '@/client/features/auth/PrivateRoute';
import { ProfilePage as ClientProfilePage } from '@/client/features/profile/pages/ProfilePage';
// Lightweight tabs — loaded immediately (small bundle impact)
import { OverviewTab } from '@/client/features/profile/pages/tabs/OverviewTab';
import { ProfileInfoTab } from '@/client/features/profile/pages/tabs/ProfileInfoTab';
import { SecurityTab } from '@/client/features/profile/pages/tabs/SecurityTab';
import { NotificationsTab } from '@/client/features/profile/pages/tabs/NotificationsTab';
import { ResultNotificationSettingsTab } from '@/client/features/profile/pages/tabs/ResultNotificationSettingsTab';
import { OutletProvider } from '@/components/router-compat';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

// Heavy tabs — lazy-loaded (53–57 KB each, split into separate chunks)
const TicketsTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/TicketsTab').then((m) => m.TicketsTab),
  { loading: () => <LoadingSpinner /> }
);
const OrdersTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/OrdersTab').then((m) => m.OrdersTab),
  { loading: () => <LoadingSpinner /> }
);
const OrderDetailTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/OrderDetailTab').then((m) => m.OrderDetailTab),
  { loading: () => <LoadingSpinner /> }
);
const RefundsTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/RefundsTab').then((m) => m.RefundsTab),
  { loading: () => <LoadingSpinner /> }
);
const RefundDetailTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/RefundDetailTab').then((m) => m.RefundDetailTab),
  { loading: () => <LoadingSpinner /> }
);
const PrizePayoutsTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/PrizePayoutsTab').then((m) => m.PrizePayoutsTab),
  { loading: () => <LoadingSpinner /> }
);
const PrizePayoutDetailTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/PrizePayoutDetailTab').then((m) => m.PrizePayoutDetailTab),
  { loading: () => <LoadingSpinner /> }
);
const ComplaintsTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/ComplaintsTab').then((m) => m.ComplaintsTab),
  { loading: () => <LoadingSpinner /> }
);
const ComplaintDetailTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/ComplaintDetailTab').then((m) => m.ComplaintDetailTab),
  { loading: () => <LoadingSpinner /> }
);
const FavoritesTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/FavoritesTab').then((m) => m.FavoritesTab),
  { loading: () => <LoadingSpinner /> }
);
const BankAccountsTab = dynamic(
  () => import('@/client/features/profile/pages/tabs/BankAccountsTab').then((m) => m.BankAccountsTab),
  { loading: () => <LoadingSpinner /> }
);

export function ProfileTabClient({ tabSegments }: { tabSegments: string[] }) {
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
        <Suspense fallback={<LoadingSpinner />}>
          <ClientProfilePage />
        </Suspense>
      </OutletProvider>
    </PrivateRoute>
  );
}

