import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";

export const DashboardPage = () => {
    return <Navigate to="/admin/dashboard/system" replace />;
};
