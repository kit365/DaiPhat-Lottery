"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { maybeNotifyAdminNavigation } from "@/admin/lib/adminNavigation";

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
