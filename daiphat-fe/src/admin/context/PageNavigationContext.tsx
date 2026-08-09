"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

function normalizeRoutePath(path: string): string {
    const [pathname] = String(path || "").split("?");
    const trimmed = pathname.replace(/\/$/, "");
    return trimmed || "/";
}

type PageNavigationContextValue = {
    startNavigation: (path: string) => void;
    completeNavigation: () => void;
    isNavigating: boolean;
};

const PageNavigationContext = createContext<PageNavigationContextValue>({
    startNavigation: () => undefined,
    completeNavigation: () => undefined,
    isNavigating: false,
});

export function PageNavigationProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname() || "";
    const [isNavigating, setIsNavigating] = useState(false);

    const startNavigation = useCallback(
        (path: string) => {
            const target = normalizeRoutePath(path);
            const current = normalizeRoutePath(pathname);
            if (target !== current) {
                setIsNavigating(true);
            }
        },
        [pathname],
    );

    const completeNavigation = useCallback(() => {
        setIsNavigating(false);
    }, []);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ path?: string }>).detail;
            if (detail?.path) {
                startNavigation(detail.path);
            }
        };

        window.addEventListener("page:navigation-start", handler);
        return () => window.removeEventListener("page:navigation-start", handler);
    }, [startNavigation]);

    // Failsafe — never leave the progress bar stuck.
    useEffect(() => {
        if (!isNavigating) {
            return;
        }

        const timeout = window.setTimeout(() => setIsNavigating(false), 20_000);
        return () => window.clearTimeout(timeout);
    }, [isNavigating]);

    const value = useMemo(
        () => ({
            startNavigation,
            completeNavigation,
            isNavigating,
        }),
        [startNavigation, completeNavigation, isNavigating],
    );

    return (
        <PageNavigationContext.Provider value={value}>
            {children}
        </PageNavigationContext.Provider>
    );
}

export const usePageNavigation = () => useContext(PageNavigationContext);

export const notifyPageNavigation = (path: string) => {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent("page:navigation-start", {
            detail: { path },
        }),
    );
};
