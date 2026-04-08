import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";

export const DashboardPage = () => {
    const { user } = useAuthStore();
    const roles = user?.roles || [];
    const isStaff = roles.some((role: any) => 
        role.isStaff || 
        role.name?.toLowerCase().includes("nhân viên") || 
        role.name?.toLowerCase().includes("staff")
    );
    const isAdmin = roles.some((role: any) => 
        role.name?.toLowerCase().includes("admin") || 
        role.name?.toLowerCase().includes("quản trị viên") ||
        role.name?.toLowerCase().includes("quản trị")
    );

    if (isAdmin) {
        return <Navigate to="/admin/dashboard/system" replace />;
    } else if (isStaff) {
        return <Navigate to="/admin/staff/tasks" replace />;
    }

    return <Navigate to="/admin/dashboard/system" replace />;
};
