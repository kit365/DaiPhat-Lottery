import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './client/layouts/Layout';
import { LayoutAdmin } from './admin/layouts/LayoutAdmin';
import { ClientRoutes } from './client/routes/index';
import { AdminRoutes, AdminAuthRoutes } from './admin/routes/index';
import { useScrollToTop } from './client/hooks/useScrollToTop';
import { ToastContainer } from 'react-toastify';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './client/components/ui/LoadingSpinner';

const NotFoundPage = lazy(() => import("./client/pages/static/NotFound").then(m => ({ default: m.NotFound })));

const ScrollToTopWrapper = ({ children }: { children: React.ReactNode }) => {
  useScrollToTop();
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTopWrapper>
        <Routes>
          {/* Client Routes */}
          <Route element={<Layout />}>
            {ClientRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element}>
                {route.children && route.children.map((child) => (
                  <Route key={child.path} path={child.path} element={child.element} />
                ))}
              </Route>
            ))}
          </Route>

          {/* Admin Routes */}
          <Route path='/admin'>
            {AdminAuthRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
            <Route element={<LayoutAdmin />}>
              {AdminRoutes.map(({ path, element, index }: any) => (
                <Route key={path || "index"} path={path} index={index} element={element} />
              ))}
            </Route>

          </Route>

          {/* Standalone Routes */}
          <Route path="*" element={
            <Suspense fallback={<LoadingSpinner />}>
              <NotFoundPage />
            </Suspense>
          } />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />
      </ScrollToTopWrapper>
    </BrowserRouter>
  )
}

export default App