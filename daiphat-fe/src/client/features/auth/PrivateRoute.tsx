import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../../stores/useAuthStore";

export const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const { token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
