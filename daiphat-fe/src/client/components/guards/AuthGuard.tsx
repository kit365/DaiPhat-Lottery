import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useEffect, useState } from "react";

export const AuthGuard = () => {
    const { user, isHydrated } = useAuthStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (isHydrated) {
            setReady(true);
        }
    }, [isHydrated]);

    if (!isHydrated || !ready) return null; // Or a loading spinner

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <Outlet />;
};
