"use client";

import { Box, Tooltip, type SxProps, type Theme } from "@mui/material";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type EllipsisTextProps = {
    children: ReactNode;
    className?: string;
    sx?: SxProps<Theme>;
};

/** Text truncate + tooltip khi overflow — dùng trong admin DataGrid / dashboard. */
export function EllipsisText({ children, className, sx }: EllipsisTextProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [title, setTitle] = useState("");

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const overflowed = el.scrollWidth > el.clientWidth + 1;
        setTitle(overflowed ? (el.textContent?.trim() ?? "") : "");
    }, []);

    useEffect(() => {
        measure();
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [children, measure]);

    const content = (
        <Box
            ref={ref}
            component="span"
            className={className}
            onMouseEnter={measure}
            sx={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                ...sx,
            }}
        >
            {children}
        </Box>
    );

    return (
        <Tooltip title={title} disableHoverListener={!title} enterDelay={300}>
            {content}
        </Tooltip>
    );
}
