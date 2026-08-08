"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

function normalizeRoutePath(path: string): string {
    const [pathname] = String(path || '').split('?');
    const trimmed = pathname.replace(/\/$/, '');
    return trimmed || '/';
}

type PageNavigationContextValue = {
    startNavigation: (path: string) => void;
    isNavigating: boolean;
};

const PageNavigationContext = createContext<PageNavigationContextValue>({
    startNavigation: () => undefined,
    isNavigating: false,
});

export function PageNavigationProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname() || '';
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    const startNavigation = useCallback(
        (path: string) => {
            const target = normalizeRoutePath(path);
            const current = normalizeRoutePath(pathname);
            if (target !== current) {
                setPendingPath(target);
            }
        },
        [pathname],
    );

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ path?: string }>).detail;
            if (detail?.path) {
                startNavigation(detail.path);
            }
        };

        window.addEventListener('page:navigation-start', handler);
        return () => window.removeEventListener('page:navigation-start', handler);
    }, [startNavigation]);

    useEffect(() => {
        if (!pendingPath) {
            return;
        }

        const current = normalizeRoutePath(pathname);
        const target = normalizeRoutePath(pendingPath);
        if (current === target) {
            setPendingPath(null);
        }
    }, [pathname, pendingPath]);

    useEffect(() => {
        if (!pendingPath) {
            return;
        }

        const timeout = window.setTimeout(() => setPendingPath(null), 15000);
        return () => window.clearTimeout(timeout);
    }, [pendingPath]);

    const value = useMemo(
        () => ({
            startNavigation,
            isNavigating: pendingPath !== null,
        }),
        [startNavigation, pendingPath],
    );

    return (
        <PageNavigationContext.Provider value={value}>
            {children}
        </PageNavigationContext.Provider>
    );
}

export const usePageNavigation = () => useContext(PageNavigationContext);

export const notifyPageNavigation = (path: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent('page:navigation-start', {
            detail: { path },
        }),
    );
};
