"use client";

import type { CSSProperties, ReactNode } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import type { LuckyDigitSegment } from "./types";
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
};

const renderSegments = (
    segments: LuckyDigitSegment[],
    fontWeight: number,
    style?: CSSProperties
) =>
    segments.map((segment, index) => (
        <span
            key={`${segment.text}-${index}`}
            style={
                segment.color
                    ? { ...style, color: segment.color, fontWeight }
                    : style
            }
        >
            {segment.text}
        </span>
    ));

/** Plain HTML span — client ticket numbers (same pattern config as admin). */
export const ClientLuckyDisplay = ({
    value,
    ticket = false,
    className,
    style,
    fontWeight = 700,
    fallback = "—",
}: LuckyDisplayProps) => {
    const display = value == null || value === "" ? "" : String(value);
    const segments = useLuckyDigitSegments(display, { ticket });

    if (!display) {
        return <span className={className}>{fallback}</span>;
    }

    return (
        <span
            className={className}
            style={{
                fontVariantNumeric: "tabular-nums",
                fontFeatureSettings: '"tnum"',
                ...style,
            }}
        >
            {renderSegments(segments, fontWeight, style)}
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
