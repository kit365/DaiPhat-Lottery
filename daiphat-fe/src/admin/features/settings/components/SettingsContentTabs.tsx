"use client";

import { Box, Tab, Tabs } from "@mui/material";
import type { ElementType } from "react";

export type SettingsContentTabItem = {
    label: string;
    icon?: ElementType;
    color?: string;
};

type SettingsContentTabsProps = {
    value: number;
    labels?: string[];
    items?: SettingsContentTabItem[];
    onChange: (index: number) => void;
};

export const SettingsContentTabs = ({ value, labels, items, onChange }: SettingsContentTabsProps) => {
    const tabs: SettingsContentTabItem[] =
        items && items.length > 0
            ? items
            : (labels ?? []).map((label) => ({ label }));

    const activeColor = tabs[value]?.color ?? "#1C252E";

    return (
        <Tabs
            value={value}
            onChange={(_, next: number) => onChange(next)}
            variant="scrollable"
            scrollButtons="auto"
            className="admin-tabs"
            sx={{
                px: 1,
                mb: 3,
                minHeight: 52,
                "& .MuiTab-root": {
                    color: "#637381",
                    minHeight: 52,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    borderRadius: "10px 10px 0 0",
                    mx: 0.25,
                    transition: "color 0.15s ease, background-color 0.15s ease",
                },
                "& .Mui-selected": {
                    color: `${activeColor} !important`,
                    bgcolor: `${activeColor}14`,
                },
                "& .MuiTabs-indicator": {
                    backgroundColor: `${activeColor} !important`,
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                },
            }}
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const color = tab.color ?? "#637381";
                return (
                    <Tab
                        key={tab.label}
                        disableRipple
                        className="admin-tab"
                        label={
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                                {Icon ? (
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "8px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            bgcolor: `${color}1A`,
                                            color,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon sx={{ fontSize: "1.05rem" }} />
                                    </Box>
                                ) : null}
                                <span>{tab.label}</span>
                            </Box>
                        }
                    />
                );
            })}
        </Tabs>
    );
};
