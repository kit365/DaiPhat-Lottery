import { Suspense } from 'react';
import './App.css';
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { LayoutAdmin } from './admin/layouts/LayoutAdmin';
import { HomePage } from './client/pages/home';
import { AdminRoutes, AdminAuthRoutes, CommonRoutes, ProfileSetupPage, OAuthCallbackPage } from './admin/routes/index';
import { PrivateRoute } from './client/pages/private.route';
import { ProfilePage as ClientProfilePage } from './client/pages/profile/ProfilePage';
import { ProfileDashboardPage } from './client/pages/profile/ProfileDashboardPage';

import { BlogListPage } from './client/pages/BlogListPage';

import { ROUTES } from './admin/constants/routes';
import { LoadingSpinner } from './client/components/ui/LoadingSpinner';
import { AuthGuard } from './admin/components/auth/AuthGuard';
import { GuestGuard } from './admin/components/auth/GuestGuard';
import { AuthInitializer } from './components/auth/AuthInitializer';

import './styles/client.css'; // New Client Theme

// --- Theme Layout Components ---

const ClientThemeLayout = () => (
  <div className="client-theme min-h-screen text-inherit font-inherit">
    <Suspense fallback={<LoadingSpinner />}>
      <Outlet />
    </Suspense>
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
        {/* Client Side Theme Context */}
        <Route element={<ClientThemeLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/blogs" element={<BlogListPage />} />

          {/* Mapping Common Routes into Client Theme */}
          {CommonRoutes.map(({ path, element }: any) => (
            <Route key={path} path={path} element={element} />
          ))}

          <Route path="/profile" element={<PrivateRoute />}>
            <Route index element={<ClientProfilePage />} />
          </Route>

          <Route path="/profile-v2" element={<PrivateRoute />}>
            <Route index element={<ProfileDashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>

        {/* Admin Side Theme Context */}
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
            <Route element={<AuthGuard><LayoutAdmin /></AuthGuard>}>
              {AdminRoutes.map(({ path, element, index }: any) => (
                <Route
                  key={path || (index ? "index" : "unknown")}
                  path={path}
                  index={index}
                  element={element}
                />
              ))}
            </Route>

            {/* Common Routes inside Admin Context */}
            {/* 1. Unguarded Common Routes (Callback) */}
            <Route path="auth/callback" element={<OAuthCallbackPage />} />

            {/* 2. Guarded Common Routes (Setup Profile) */}
            <Route element={<AuthGuard />}>
              <Route path="setup-profile" element={<ProfileSetupPage />} />
              {/* Add other guarded common routes here if needed */}
            </Route>
          </Route>
        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
