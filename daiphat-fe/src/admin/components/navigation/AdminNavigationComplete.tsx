"use client";

import { useEffect } from "react";
import { usePageNavigation } from "@/admin/context/PageNavigationContext";

/** Signals that the route's client JS bundle has mounted — ends the top progress bar. */
export function AdminNavigationComplete() {
    const { completeNavigation } = usePageNavigation();

    useEffect(() => {
        completeNavigation();
    }, [completeNavigation]);

    return null;
}
