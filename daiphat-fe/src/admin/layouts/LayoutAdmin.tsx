"use client";

import { ThemeProvider } from "@mui/material/styles";
import { Suspense } from "react";

import { SideBar } from "../components/layouts/sidebar/SideBar";
import { Header } from "../components/layouts/Header";
import { adminTheme } from "../config/theme";
import '../styles/index.css';
import { useSidebar } from "../context/sidebar/useSidebar";
import { SidebarProvider } from "../context/sidebar/SidebarProvider";
import { SocketProvider } from "../context/SocketContext";
import { AdminProviders } from "../providers/AdminProviders";
import { NavigationProgressBar } from "../components/ui/NavigationProgressBar";
import { PageNavigationProvider } from "../context/PageNavigationContext";
import { AdminBadgeCountsProvider } from "../context/AdminBadgeCountsProvider";
import { SpinnerLoading } from "../components/ui/SpinnerLoading";
import { useAdminLoginSuccessToast } from "../features/auth/hooks/useAdminLoginSuccessToast";
import { usePrefetchAdminPagesWhenIdle } from "../hooks/usePrefetchAdminPagesWhenIdle";
import { useAuthStore } from "../../stores/useAuthStore";

const LayoutAdminContent = ({ children }: { children?: React.ReactNode }) => {
    const { user, token } = useAuthStore();
    const { isOpen } = useSidebar();
    useAdminLoginSuccessToast();
    usePrefetchAdminPagesWhenIdle(!!user && !!token);

    return (
        <div className="flex min-h-screen bg-white overflow-x-hidden w-full max-w-full">
            <NavigationProgressBar />
            <SideBar />

            <div className={`flex-1 min-w-0 min-h-screen bg-white transition-[padding-left] duration-[120ms] ease-linear ${isOpen ? 'pl-[300px]' : 'pl-[88px]'}`}>
                <ThemeProvider theme={adminTheme}><Header /></ThemeProvider>

                <ThemeProvider theme={adminTheme}>
                    <main className="max-w-[1536px] w-full mx-auto px-[40px] pt-[8px] pb-[64px]">
                        <Suspense fallback={<SpinnerLoading message="Đang tải trang..." minHeight={360} />}>
                            {children}
                        </Suspense>
                    </main>
                </ThemeProvider>
            </div>
        </div>
    );
};

export const LayoutAdmin = ({ children }: { children?: React.ReactNode }) => {
    return (
        <PageNavigationProvider>
            <AdminProviders>
                <SocketProvider>
                    <AdminBadgeCountsProvider>
                        <SidebarProvider>
                            <LayoutAdminContent>{children}</LayoutAdminContent>
                        </SidebarProvider>
                    </AdminBadgeCountsProvider>
                </SocketProvider>
            </AdminProviders>
        </PageNavigationProvider>
    );
};
