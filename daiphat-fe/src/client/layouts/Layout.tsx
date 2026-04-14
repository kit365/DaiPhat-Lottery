import { Outlet } from "react-router-dom";
import { Header } from "../components/layouts/Header";
import { ScrollToTopButton } from "../components/layouts/ScrollToTopButton";
import "../styles/index.css";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { getMe } from "../api/auth.api";
import Cookies from "js-cookie";

import { Suspense } from "react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export const Layout = () => {
    const { user, login, isHydrated } = useAuthStore();

    useEffect(() => {
        // Clean up Facebook OAuth fragment
        if (window.location.hash === '#_=_') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        const fetchMe = async () => {
            const token = Cookies.get("accessToken");
            if (isHydrated && !user && token) {
                try {
                    const response = await getMe();
                    if (response.success && response.user) {
                        // Token is already in cookie, so we just need to update user in store
                        login(response.user, "");
                    }
                } catch (error) {
                    // Cookie might be expired or invalid, clear store if needed
                    console.log("Session expired or invalid token");
                }
            }
        };

        fetchMe();
    }, [isHydrated, user, login]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1">
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet />
                </Suspense>
            </div>
            <ScrollToTopButton />
        </div>
    );
};
