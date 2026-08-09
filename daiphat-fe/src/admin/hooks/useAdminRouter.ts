"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { notifyPageNavigation } from "@/admin/context/PageNavigationContext";

const maybeNotifyAdminNavigation = (target: string) => {
    if (target.startsWith("/admin")) {
        notifyPageNavigation(target);
    }
};

/** Next.js router with admin navigation progress bar integration. */
export function useAdminRouter() {
    const router = useRouter();

    return useMemo(
        () => ({
            push: (url: string) => {
                maybeNotifyAdminNavigation(url);
                router.push(url);
            },
            replace: (url: string) => {
                maybeNotifyAdminNavigation(url);
                router.replace(url);
            },
            back: () => router.back(),
            prefetch: (url: string) => router.prefetch(url),
            refresh: () => router.refresh(),
        }),
        [router],
    );
}
