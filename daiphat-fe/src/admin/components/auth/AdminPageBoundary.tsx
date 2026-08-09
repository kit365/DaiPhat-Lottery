"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { PermissionGuard } from "./PermissionGuard";
import { AdminNavigationComplete } from "@/admin/components/navigation/AdminNavigationComplete";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";
import type { ComponentType } from "react";

interface AdminPageBoundaryProps {
    permission?: string;
    permissions?: string[];
    loader: () => Promise<Record<string, unknown>>;
    exportName?: string;
}

const componentCache = new Map<string, ComponentType>();

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

export function AdminPageBoundary({ permission, permissions, loader, exportName }: AdminPageBoundaryProps) {
    const DynamicComponent = useMemo(() => {
        const cacheKey = exportName ? `${loader.toString()}_${exportName}` : loader.toString();

        let comp = componentCache.get(cacheKey);
        if (!comp) {
            comp = dynamic(
                () =>
                    loader().then((m) => {
                        const Page = (exportName && m[exportName] ? m[exportName] : m.default || m) as ComponentType;
                        return wrapWithNavigationComplete(Page);
                    }),
                {
                    ssr: false,
                    loading: () => null,
                },
            );
            componentCache.set(cacheKey, comp);
        }
        return comp;
    }, [loader, exportName]);

    return (
        <PermissionGuard
            permission={permission}
            permissions={permissions}
            fallback={<SpinnerLoading message="Đang xác thực quyền truy cập..." />}
        >
            <DynamicComponent />
        </PermissionGuard>
    );
}
