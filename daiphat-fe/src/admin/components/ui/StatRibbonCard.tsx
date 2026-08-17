"use client";

import type { ReactNode } from "react";
import { SxProps, Theme } from "@mui/material";
import {
    AdminKpiCard,
    AdminKpiCardsGrid,
    type AdminKpiTone,
} from "./AdminKpiCard";

export type StatRibbonColor = "orange" | "green" | "cyan" | "purple" | "red";

const COLOR_TO_TONE: Record<StatRibbonColor, AdminKpiTone> = {
    orange: "amber",
    green: "green",
    cyan: "cyan",
    purple: "slate",
    red: "rose",
};

export interface StatRibbonCardProps {
    value: string;
    label: string;
    icon: string;
    color?: StatRibbonColor;
    valueSize?: "default" | "compact";
    sx?: SxProps<Theme>;
}

export const StatRibbonCard = ({
    value,
    label,
    icon,
    color = "orange",
    valueSize = "default",
    sx,
}: StatRibbonCardProps) => (
    <AdminKpiCard
        value={value}
        label={label}
        icon={icon}
        tone={COLOR_TO_TONE[color]}
        valueSize={valueSize}
        sx={sx}
    />
);

export interface StatRibbonCardsGridProps {
    children: ReactNode;
    columns?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
    };
}

export const StatRibbonCardsGrid = ({
    children,
    columns = { xs: 1, sm: 2, md: 4 },
}: StatRibbonCardsGridProps) => (
    <AdminKpiCardsGrid columns={columns}>{children}</AdminKpiCardsGrid>
);
