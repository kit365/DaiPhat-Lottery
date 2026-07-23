import { Suspense } from 'react';
import './App.css';
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { LayoutAdmin } from './admin/layouts/LayoutAdmin';
import { HomePage } from './client/features/home/HomePage';
import { SchedulePage } from './client/features/schedule';
import { AdminRoutes, AdminAuthRoutes, CommonRoutes, ProfileSetupPage, OAuthCallbackPage } from './admin/routes/index';
import { PrivateRoute } from './client/features/auth/PrivateRoute';
import { ProfilePage as ClientProfilePage } from './client/features/profile/pages/ProfilePage';
import { ProfileDashboardPage } from './client/features/profile/pages/ProfileDashboardPage';
import { OverviewTab } from './client/features/profile/pages/tabs/OverviewTab';
import { ProfileInfoTab } from './client/features/profile/pages/tabs/ProfileInfoTab';
import { TicketsTab } from './client/features/profile/pages/tabs/TicketsTab';
import { OrdersTab } from './client/features/profile/pages/tabs/OrdersTab';
import { OrderDetailTab } from './client/features/profile/pages/tabs/OrderDetailTab';
import { FavoritesTab } from './client/features/profile/pages/tabs/FavoritesTab';
import { NotificationsTab } from './client/features/profile/pages/tabs/NotificationsTab';
import { ResultNotificationSettingsTab } from './client/features/profile/pages/tabs/ResultNotificationSettingsTab';
import { SecurityTab } from './client/features/profile/pages/tabs/SecurityTab';
import { RefundsTab } from './client/features/profile/pages/tabs/RefundsTab';
import { RefundDetailTab } from './client/features/profile/pages/tabs/RefundDetailTab';
import { BankAccountsTab } from './client/features/profile/pages/tabs/BankAccountsTab';
import { ComplaintsTab } from './client/features/profile/pages/tabs/ComplaintsTab';
import { ComplaintDetailTab } from './client/features/profile/pages/tabs/ComplaintDetailTab';

import { BlogListPage, BlogDetailPage } from './client/features/blog';
import { CartPage, CheckoutPage, CheckoutResultPage } from './client/features/cart';
import { BuyTicketPage } from './client/features/buy-ticket/BuyTicketPage';
import { LoginPage } from './client/features/auth/pages/LoginPage';
import { RegisterPage } from './client/features/auth/pages/RegisterPage';
import { ForgotPasswordPage as ClientForgotPasswordPage } from './client/features/auth/pages/ForgotPasswordPage';
import { NotFoundPage } from './client/features/not-found/NotFoundPage';

import { ROUTES } from './admin/constants/routes';
import { LoadingSpinner } from './client/components/ui/LoadingSpinner';
import { AuthGuard } from './admin/components/auth/AuthGuard';
import { GuestGuard } from './admin/components/auth/GuestGuard';
import { AuthInitializer } from './components/auth/AuthInitializer';

import './styles/client.css'; // New Client Theme

import { Footer } from './client/components/layout/Footer';

import { ChatbotPopup } from './client/components/support/ChatbotPopup';

const ClientThemeLayout = () => (
  <div className="client-theme min-h-screen text-inherit font-inherit flex flex-col relative">
    <div className="flex-1 flex flex-col">
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </div>
    <Footer />
    <ChatbotPopup />
  </div>
);

const AdminThemeLayout = () => (
  <div className="admin-theme min-h-screen text-inherit font-inherit">
    <Suspense fallback={<LoadingSpinner />}>
      <Outlet />
    </Suspense>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Routes>
        {/* Admin routes first so /admin/* is never captured by the client catch-all */}
        <Route path={ROUTES.ADMIN.ROOT}>
          <Route element={<AdminThemeLayout />}>
            {/* Admin Auth (Login/Forgot password in Admin Context) */}
            {AdminAuthRoutes.map(({ path, element }: any) => (
              <Route
                key={path}
                path={path}
                element={<GuestGuard>{element}</GuestGuard>}
              />
            ))}

            {/* Admin Authenticated Areas */}
            <Route element={<AuthGuard />}>
              <Route element={<LayoutAdmin />}>
                {AdminRoutes.map(({ path, element, index }: any) => (
                  <Route
                    key={path || (index ? "index" : "unknown")}
                    path={path}
                    index={index}
                    element={element}
                  />
                ))}
              </Route>
            </Route>

            {/* Common Routes inside Admin Context */}
            <Route path="auth/callback" element={<OAuthCallbackPage />} />

            <Route element={<AuthGuard />}>
              <Route path="setup-profile" element={<ProfileSetupPage />} />
            </Route>
          </Route>
        </Route>

        {/* Client Side Theme Context */}
        <Route element={<ClientThemeLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/lich-mo-thuong" element={<SchedulePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ClientForgotPasswordPage />} />
          <Route path="/blogs" element={<BlogListPage />} />
          <Route path="/blogs/detail/:slug" element={<BlogDetailPage />} />

          {/* Mapping Common Routes into Client Theme */}
          {CommonRoutes.map(({ path, element }: any) => (
            <Route key={path} path={path} element={element} />
          ))}

          <Route path="/buy-ticket" element={<BuyTicketPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/result" element={<CheckoutResultPage />} />
          <Route path="/payment/payos/return" element={<CheckoutResultPage />} />
          <Route path="/payment/payos/cancel" element={<CheckoutResultPage />} />

          <Route path="/profile" element={<PrivateRoute />}>
            <Route element={<ClientProfilePage />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewTab />} />
              <Route path="info" element={<ProfileInfoTab />} />
              <Route path="orders" element={<OrdersTab />} />
              <Route path="orders/:id" element={<OrderDetailTab />} />
              <Route path="refunds" element={<RefundsTab />} />
              <Route path="refunds/:id" element={<RefundDetailTab />} />
              <Route path="complaints" element={<ComplaintsTab />} />
              <Route path="complaints/:id" element={<ComplaintDetailTab />} />
              <Route path="bank-accounts" element={<BankAccountsTab />} />
              <Route path="tickets" element={<TicketsTab />} />
              <Route path="favorites" element={<FavoritesTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
              <Route path="result-notifications" element={<ResultNotificationSettingsTab />} />
              <Route path="settings" element={<SecurityTab />} />
            </Route>
          </Route>

          <Route path="/profile-v2" element={<PrivateRoute />}>
            <Route index element={<ProfileDashboardPage />} />
          </Route>

        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
