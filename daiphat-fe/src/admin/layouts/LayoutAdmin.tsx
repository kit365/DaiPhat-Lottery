"use client";

import { Outlet, useLocation } from "@/components/router-compat";
import { ThemeProvider } from "@mui/material/styles";

import { SideBar } from "../components/layouts/sidebar/SideBar";
import { Header } from "../components/layouts/Header";
import { adminTheme } from "../config/theme";
import '../styles/index.css';
import { useSidebar } from "../context/sidebar/useSidebar";
import { SidebarProvider } from "../context/sidebar/SidebarProvider";
import { useAuth } from "../pages/authen/hooks/useAuth";
import { useAuthStore } from "../../stores/useAuthStore";

import { SocketProvider } from "../context/SocketContext";

import { Suspense } from "react";
import LoadingScreen from "../components/ui/LoadingScreen";

import { ROUTES } from "../constants/routes";

const LayoutAdminContent = ({ children }: { children?: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    const { isOpen } = useSidebar();

    // [THE VAULT DOOR] - Chặn đứng mọi nỗ lực xem Dashboard khi chưa setup xong
    if (isLoading && !user) {
        return <LoadingScreen />;
    }

    if (user && (!user.hasPassword || !user.agreedToTerms)) {
        return <LoadingScreen />;
    }

    const isBlogDetail = location.pathname.startsWith(ROUTES.ADMIN.BLOGS.DETAIL);
    const fullWidthRoutes = [
        ROUTES.ADMIN.DASHBOARD.ROOT,
        ROUTES.ADMIN.DASHBOARD.SYSTEM,
        ROUTES.ADMIN.DASHBOARD.ANALYTICS,
        ROUTES.ADMIN.DASHBOARD.ECOMMERCE
    ];
    const isFullWidthPage = fullWidthRoutes.some(route => route === location.pathname) || isBlogDetail;

    // Route state Toast listener removed. Using direct toast in use-login now.

    return (
        <div className="flex min-h-screen bg-white">
            <SideBar />

            <div className={`flex-1 min-h-screen bg-white transition-[padding-left] duration-[120ms] ease-linear ${isOpen ? 'pl-[300px]' : 'pl-[88px]'}`}>
                <ThemeProvider theme={adminTheme}><Header /></ThemeProvider>

                <ThemeProvider theme={adminTheme}>
                    <main className="max-w-[1536px] w-full mx-auto px-[40px] pt-[8px] pb-[64px]">
                        <Suspense fallback={<LoadingScreen />}>
                            {children ? children : <Outlet />}
                        </Suspense>
                    </main>
                </ThemeProvider>
            </div>

        </div>
    );
};

export const LayoutAdmin = ({ children }: { children?: React.ReactNode }) => {
    return (
        <SocketProvider>
            <SidebarProvider>
                <LayoutAdminContent>{children}</LayoutAdminContent>
            </SidebarProvider>
        </SocketProvider>
    );
};
