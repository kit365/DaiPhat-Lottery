"use client";

import type { ReactNode } from "react";
import { Box, Card, SxProps, Theme, Typography } from "@mui/material";
import { Icon } from "./AdminIcon";

export type AdminKpiTone = "blue" | "amber" | "green" | "cyan" | "orange" | "rose" | "slate";

type RibbonTheme = {
    ribbon: string;
    icon: string;
};

const TONE_THEMES: Record<AdminKpiTone, RibbonTheme> = {
    blue: { ribbon: "rgba(59, 130, 246, 0.16)", icon: "#2563eb" },
    amber: { ribbon: "rgba(255, 171, 0, 0.16)", icon: "#FFAB00" },
    green: { ribbon: "rgba(34, 197, 94, 0.16)", icon: "#22C55E" },
    cyan: { ribbon: "rgba(0, 184, 217, 0.16)", icon: "#00B8D9" },
    orange: { ribbon: "rgba(255, 171, 0, 0.16)", icon: "#FFAB00" },
    rose: { ribbon: "rgba(255, 86, 48, 0.16)", icon: "#FF5630" },
    slate: { ribbon: "rgba(142, 84, 233, 0.16)", icon: "#8E54E9" },
};

const ACCENT_THEME: RibbonTheme = {
    ribbon: "rgba(34, 197, 94, 0.16)",
    icon: "#22C55E",
};

export interface AdminKpiCardProps {
    label: string;
    value: string;
    icon: ReactNode | string;
    tone?: AdminKpiTone;
    accent?: boolean;
    valueSize?: "default" | "compact";
    /** Full value shown on hover (e.g. exact VNĐ when display uses compact k). */
    valueTitle?: string;
    sx?: SxProps<Theme>;
}

export const AdminKpiCard = ({
    label,
    value,
    icon,
    tone = "blue",
    accent = false,
    valueSize,
    valueTitle,
    sx,
}: AdminKpiCardProps) => {
    const theme = accent ? ACCENT_THEME : TONE_THEMES[tone];
    const isCompactValue = valueSize === "compact" || value.length > 10;

    const iconNode =
        typeof icon === "string" ? (
            <Icon icon={icon} width={24} height={24} />
        ) : (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: "1.5rem" },
                }}
            >
                {icon}
            </Box>
        );

    return (
        <Card
            elevation={0}
            sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "16px",
                bgcolor: "#fff",
                boxShadow:
                    "var(--customShadows-card, 0 0 2px rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12))",
                minHeight: 96,
                height: "100%",
                ...sx,
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "46%",
                    height: "100%",
                    bgcolor: theme.ribbon,
                    clipPath: "polygon(36% 0, 100% 0, 100% 100%, 0% 100%)",
                    pointerEvents: "none",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.icon,
                    pointerEvents: "none",
                }}
            >
                {iconNode}
            </Box>

            <Box
                sx={{
                    px: 2,
                    py: 2,
                    pr: { xs: 8, sm: 9 },
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minHeight: 96,
                }}
            >
                <Typography
                    title={valueTitle ?? value}
                    sx={{
                        fontSize: isCompactValue
                            ? { xs: "1.125rem", sm: "1.25rem" }
                            : { xs: "1.375rem", sm: "1.5rem", md: "1.625rem" },
                        fontWeight: 700,
                        lineHeight: 1.25,
                        color: "var(--palette-text-primary, #1C252E)",
                        fontFamily: "Barlow, Public Sans, sans-serif",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                    }}
                >
                    {value}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.5,
                        color: "var(--palette-text-secondary, #637381)",
                        fontWeight: 500,
                        fontSize: "0.8125rem",
                        lineHeight: 1.4,
                        whiteSpace: "normal",
                    }}
                >
                    {label}
                </Typography>
            </Box>
        </Card>
    );
};

export interface AdminKpiCardsGridProps {
    children: ReactNode;
    columns?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
    };
    gap?: number;
    sx?: SxProps<Theme>;
}

export const AdminKpiCardsGrid = ({
    children,
    columns = { xs: 1, sm: 2, md: 4 },
    gap = 2,
    sx,
}: AdminKpiCardsGridProps) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: {
                xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
                sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
                md: `repeat(${columns.md ?? 4}, minmax(0, 1fr))`,
                ...(columns.lg ? { lg: `repeat(${columns.lg}, minmax(0, 1fr))` } : {}),
                ...(columns.xl ? { xl: `repeat(${columns.xl}, minmax(0, 1fr))` } : {}),
            },
            gap,
            mb: 2.5,
            width: "100%",
            alignItems: "stretch",
            ...sx,
        }}
    >
        {children}
    </Box>
);
