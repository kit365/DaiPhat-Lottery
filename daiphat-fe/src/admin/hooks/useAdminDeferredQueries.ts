"use client";

import { useEffect, useState } from "react";

/** Delays non-critical sidebar badge / secondary queries until the shell is interactive. */
export function useAdminDeferredQueries(delayMs = 1200) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const activate = () => setReady(true);

        if ("requestIdleCallback" in window) {
            const idleId = window.requestIdleCallback(activate, { timeout: delayMs });
            return () => window.cancelIdleCallback(idleId);
        }

        const timer = setTimeout(activate, delayMs);
        return () => clearTimeout(timer);
    }, [delayMs]);

    return ready;
}
