"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { PermissionGuard } from "@/admin/components/auth/PermissionGuard";
import { AdminNavigationComplete } from "@/admin/components/navigation/AdminNavigationComplete";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";

type AdminClientPageOptions =
    | {
          component: ComponentType<any>;
          permission?: string;
          permissions?: string[];
          loader?: never;
          exportName?: never;
      }
    | {
          component?: never;
          loader: () => Promise<Record<string, unknown>>;
          exportName: string;
          permission?: string;
          permissions?: string[];
      };

function wrapWithNavigationComplete<P extends object>(Component: ComponentType<P>) {
    const Wrapped = (props: P) => (
        <>
            <AdminNavigationComplete />
            <Component {...props} />
        </>
    );
    Wrapped.displayName = `WithNavigationComplete(${Component.displayName || Component.name || "Page"})`;
    return Wrapped;
}

function PageContentLoading() {
    return <SpinnerLoading message="Đang tải trang..." minHeight={360} />;
}

function createLazyFeaturePage(loader: () => Promise<Record<string, unknown>>, exportName: string) {
    return dynamic(
        () =>
            loader().then((module) => {
                const Page = (module[exportName] ?? module.default) as ComponentType;
                return wrapWithNavigationComplete(Page);
            }),
        {
            ssr: false,
            loading: PageContentLoading,
        },
    );
}

export function createAdminClientPage(options: AdminClientPageOptions) {
    const { permission, permissions } = options;
    const guardFallback = <SpinnerLoading message="Đang xác thực quyền truy cập..." />;

    if ("component" in options && options.component) {
        const Component = options.component;

        return function ClientPage(props: Record<string, unknown>) {
            return (
                <PermissionGuard
                    permission={permission}
                    permissions={permissions}
                    fallback={guardFallback}
                >
                    <AdminNavigationComplete />
                    <Component {...props} />
                </PermissionGuard>
            );
        };
    }

    const FeaturePage = createLazyFeaturePage(options.loader, options.exportName);

    return function ClientPage(props: Record<string, unknown>) {
        return (
            <PermissionGuard
                permission={permission}
                permissions={permissions}
                fallback={guardFallback}
            >
                <FeaturePage {...props} />
            </PermissionGuard>
        );
    };
}
