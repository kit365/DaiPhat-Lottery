"use client";

import type { CSSProperties, ReactNode } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { useLuckyDigitSegments } from "./useLuckyDigitSegments";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export type LuckyDisplayProps = {
    value?: string | number | null;
    /** Ticket numbers use full-string matching; other values only color digit runs. */
    ticket?: boolean;
    className?: string;
    style?: CSSProperties;
    sx?: SxProps<Theme>;
    fontSize?: string | number;
    fontWeight?: number;
    letterSpacing?: string;
    component?: "span" | "div";
    fallback?: ReactNode;
    /** Hide the small "Số đẹp" chip (parent frame already shows it). */
    showBadge?: boolean;
};

/** Plain HTML span — client ticket numbers (same pattern config as admin). */
export const ClientLuckyDisplay = ({
    value,
    ticket = false,
    className,
    style,
    fallback = "—",
    showBadge = true,
}: LuckyDisplayProps) => {
    const display = value == null || value === "" ? "" : String(value);
    const segments = useLuckyDigitSegments(display, { ticket });
    const isLuckyTicket = ticket && segments.some((segment) => Boolean(segment.color));

    if (!display) {
        return <span className={className}>{fallback}</span>;
    }

    const numberStyle: CSSProperties = {
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        ...style,
    };

    if (!isLuckyTicket || !showBadge) {
        return (
            <span className={className} style={numberStyle}>
                {display}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 align-middle">
            <span className={className} style={numberStyle}>
                {display}
            </span>
            <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold leading-none text-[#B76E00] bg-[#FFE082]">
                Số đẹp
            </span>
        </span>
    );
};

/** MUI span — admin screens. */
export const AdminLuckyDisplay = ({
    value,
    ticket = false,
    sx,
    fontSize = "inherit",
    fontWeight = 700,
    letterSpacing,
    component = "span",
    fallback = "—",
}: LuckyDisplayProps) => {
    const display = value == null || value === "" ? "" : String(value);
    const segments = useLuckyDigitSegments(display, { ticket });

    if (!display) {
        return (
            <Typography component={component} sx={sx}>
                {fallback}
            </Typography>
        );
    }

    return (
        <Typography
            component={component}
            sx={{
                fontFamily: MONO,
                fontWeight,
                fontSize,
                letterSpacing,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                ...sx,
            }}
        >
            {segments.map((segment, index) => (
                <Box
                    component="span"
                    key={`${segment.text}-${index}`}
                    sx={
                        segment.color
                            ? { color: segment.color, fontWeight }
                            : undefined
                    }
                >
                    {segment.text}
                </Box>
            ))}
        </Typography>
    );
};
