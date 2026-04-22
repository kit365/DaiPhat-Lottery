import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";

export const PrivateRoute = () => {
  const { token, openLoginModal } = useAuthStore();

  useEffect(() => {
    if (!token) {
      openLoginModal();
    }
  }, [token, openLoginModal]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
