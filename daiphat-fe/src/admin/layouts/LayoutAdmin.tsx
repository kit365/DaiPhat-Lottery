import { Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { ToastContainer } from "react-toastify";
import { SideBar } from "../components/layouts/sidebar/SideBar";
import { Header } from "../components/layouts/Header";
import { adminTheme } from "../config/theme";
import '../styles/index.css';
import { useSidebar } from "../context/sidebar/useSidebar";
import { SidebarProvider } from "../context/sidebar/SidebarProvider";
import { useGetMe } from "../pages/authen/hooks/use-get-me";

import { SocketProvider } from "../context/SocketContext";
import { OverrunAlerter } from "../components/OverrunAlerter";

import { Suspense } from "react";
import LoadingScreen from "../components/ui/LoadingScreen";

const LayoutAdminContent = () => {
    useGetMe();
    const location = useLocation();
    const { isOpen } = useSidebar();

    const isBlogDetail = location.pathname.startsWith("/admin/blog/detail/");
    const fullWidthRoutes = ["/admin/dashboard", "/admin/dashboard/system", "/admin/dashboard/analytics", "/admin/dashboard/ecommerce"];
    const isFullWidthPage = fullWidthRoutes.includes(location.pathname) || isBlogDetail;

    return (
        <div className="flex">
            <OverrunAlerter />
            <ToastContainer />
            <SideBar />

            <div className={`flex-1 transition-[padding-left] duration-[120ms] ease-linear ${isOpen ? 'pl-[300px]' : 'pl-[88px]'}`}>
                <ThemeProvider theme={adminTheme}><Header /></ThemeProvider>

                <ThemeProvider theme={adminTheme}>
                    <main
                        className={
                            isFullWidthPage
                                ? "max-w-[1536px] mx-auto px-[calc(5*var(--spacing))] pt-[8px] pb-[64px]"
                                : "w-[1200px] mx-auto px-[40px] pt-[8px] pb-[64px]"
                        }
                    >
                        <Suspense fallback={<LoadingScreen />}>
                            <Outlet />
                        </Suspense>
                    </main>
                </ThemeProvider>
            </div>

        </div>
    );
};

export const LayoutAdmin = () => {
    return (
        <SocketProvider>
            <SidebarProvider>
                <LayoutAdminContent />
            </SidebarProvider>
        </SocketProvider>
    );
};
