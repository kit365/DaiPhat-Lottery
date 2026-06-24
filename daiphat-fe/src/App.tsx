import { Suspense } from 'react';
import './App.css';
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { LayoutAdmin } from './admin/layouts/LayoutAdmin';
import { HomePage } from './client/pages/home';
import { SchedulePage } from './client/pages/schedule';
import { AdminRoutes, AdminAuthRoutes, CommonRoutes, ProfileSetupPage, OAuthCallbackPage, AcceptInvitePage } from './admin/routes/index';
import { PrivateRoute } from './client/pages/private.route';
import { ProfilePage as ClientProfilePage } from './client/pages/profile/ProfilePage';
import { ProfileDashboardPage } from './client/pages/profile/ProfileDashboardPage';
import { OverviewTab } from './client/pages/profile/tabs/OverviewTab';
import { ProfileInfoTab } from './client/pages/profile/tabs/ProfileInfoTab';
import { TicketsTab } from './client/pages/profile/tabs/TicketsTab';
import { OrdersTab } from './client/pages/profile/tabs/OrdersTab';
import { OrderDetailTab } from './client/pages/profile/tabs/OrderDetailTab';
import { FavoritesTab } from './client/pages/profile/tabs/FavoritesTab';
import { NotificationsTab } from './client/pages/profile/tabs/NotificationsTab';
import { SecurityTab } from './client/pages/profile/tabs/SecurityTab';
import { RefundsTab } from './client/pages/profile/tabs/RefundsTab';
import { RefundDetailTab } from './client/pages/profile/tabs/RefundDetailTab';
import { BankAccountsTab } from './client/pages/profile/tabs/BankAccountsTab';

import { BlogListPage } from './client/pages/BlogListPage';
import { BlogDetailPage } from './client/pages/BlogDetailPage';
import { CartPage } from './client/pages/cart/CartPage';
import { CheckoutPage } from './client/pages/cart/CheckoutPage';
import { BuyTicketPage } from './client/pages/buy-ticket/BuyTicketPage';
import { CheckoutResultPage } from './client/pages/cart/CheckoutResultPage';
import { LoginPage } from './client/pages/auth/LoginPage';
import { RegisterPage } from './client/pages/auth/RegisterPage';
import { ForgotPasswordPage as ClientForgotPasswordPage } from './client/pages/auth/ForgotPasswordPage';
import { NotFoundPage } from './client/pages/NotFoundPage';

import { ROUTES } from './admin/constants/routes';
import { LoadingSpinner } from './client/components/ui/LoadingSpinner';
import { AuthGuard } from './admin/components/auth/AuthGuard';
import { GuestGuard } from './admin/components/auth/GuestGuard';
import { AuthInitializer } from './components/auth/AuthInitializer';

import './styles/client.css'; // New Client Theme

import { Footer } from './client/components/layout/Footer';

// --- Theme Layout Components ---

const ClientThemeLayout = () => (
  <div className="client-theme min-h-screen text-inherit font-inherit flex flex-col">
    <div className="flex-1 flex flex-col">
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </div>
    <Footer />
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
            <Route path="accept-invite" element={<AcceptInvitePage />} />

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
              <Route path="bank-accounts" element={<BankAccountsTab />} />
              <Route path="tickets" element={<TicketsTab />} />
              <Route path="favorites" element={<FavoritesTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
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
