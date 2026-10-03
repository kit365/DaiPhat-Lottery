"use client";

import { ThemeProvider } from "@mui/material/styles";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

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
import { resolveRoleCode } from "../utils/permission.util";
import { USER_ROLES } from "../../constants/role.constants";

const isStaffUser = (user: unknown): boolean => {
    if (!user || typeof user !== "object") return false;
    const u = user as { role?: unknown; rolesName?: string[] };
    const rawRole = typeof u.role === "string" ? u.role : (u.role as { code?: string } | undefined)?.code || "";
    const normalized = rawRole.startsWith("ROLE_") ? rawRole : `ROLE_${rawRole}`;
    return (
        normalized === USER_ROLES.ADMIN ||
        normalized === "ROLE_SUPER_ADMIN" ||
        normalized === USER_ROLES.STAFF_OPERATOR ||
        u.rolesName?.includes("ROLE_ADMIN") === true ||
        u.rolesName?.includes("ROLE_STAFF_OPERATOR") === true
    );
};

const LayoutAdminContent = ({ children }: { children?: React.ReactNode }) => {
    const router = useRouter();
    const { user, token, isHydrated } = useAuthStore();
    const { isOpen } = useSidebar();
    const isStaff = isStaffUser(user);

    useEffect(() => {
        if (isHydrated && user && !isStaff) {
            router.replace('/');
        }
    }, [isHydrated, user, isStaff, router]);

    useAdminLoginSuccessToast();
    usePrefetchAdminPagesWhenIdle(!!user && !!token && isStaff);

    if (user && !isStaff) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <SpinnerLoading message="Bạn không có quyền truy cập trang quản trị. Đang chuyển hướng..." minHeight={360} />
            </div>
        );
    }

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

