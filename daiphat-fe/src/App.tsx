import { lazy, Suspense } from 'react';
import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LayoutAdmin } from './admin/layouts/LayoutAdmin';
import { AdminRoutes, AdminAuthRoutes } from './admin/routes/index';
import { LoadingSpinner } from './client/components/ui/LoadingSpinner';
import { AuthGuard } from './admin/components/auth/AuthGuard';
import { GuestGuard } from './admin/components/auth/GuestGuard';
import { Login } from './client/pages/login';
import { Register } from './client/pages/register';




function App() {
  return (
    <BrowserRouter>
      <Routes>


        {/* Client Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        {/* Admin Routes */}
        <Route path='/admin'>
          {AdminAuthRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<GuestGuard>{element}</GuestGuard>}
            />
          ))}
          <Route element={<AuthGuard><LayoutAdmin /></AuthGuard>}>
            {AdminRoutes.map(({ path, element, index }: any) => (
              <Route key={path || "index"} path={path} index={index} element={element} />
            ))}
          </Route>
        </Route>

        {/* Standalone Routes */}
        <Route path="*" element={
          <Suspense fallback={<LoadingSpinner />}>
            {/* <NotFoundPage /> */}
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
