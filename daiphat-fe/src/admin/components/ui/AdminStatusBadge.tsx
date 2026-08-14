"use client";

import { Tooltip } from "@mui/material";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface AdminStatusBadgeProps {
    label: string;
    modifier?: string;
    className?: string;
}

export const AdminStatusBadge = ({ label, modifier, className }: AdminStatusBadgeProps) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [isOverflowed, setIsOverflowed] = useState(false);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setIsOverflowed(el.scrollWidth > el.clientWidth + 1);
    }, []);

    useLayoutEffect(() => {
        measure();
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [label, measure]);

    return (
        <Tooltip title={label} disableHoverListener={!isOverflowed} placement="top" enterDelay={300}>
            <span className="admin-status-badge-host">
                <span
                    ref={ref}
                    className={["admin-status-badge", modifier, className].filter(Boolean).join(" ")}
                >
                    {label}
                </span>
            </span>
        </Tooltip>
    );
};
