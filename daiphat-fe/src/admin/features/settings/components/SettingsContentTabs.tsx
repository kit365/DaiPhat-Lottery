"use client";

import { Tab, Tabs } from "@mui/material";

type SettingsContentTabsProps = {
    value: number;
    labels: string[];
    onChange: (index: number) => void;
};

export const SettingsContentTabs = ({ value, labels, onChange }: SettingsContentTabsProps) => (
    <Tabs
        value={value}
        onChange={(_, next: number) => onChange(next)}
        variant="scrollable"
        scrollButtons="auto"
        className="admin-tabs"
        sx={{
            px: 0,
            mb: 3,
            minHeight: 48,
            "& .MuiTab-root": {
                color: "#637381",
            },
            "& .Mui-selected": {
                color: "#1C252E !important",
            },
            "& .MuiTabs-indicator": {
                backgroundColor: "#1C252E !important",
            },
        }}
    >
        {labels.map((label) => (
            <Tab key={label} label={label} className="admin-tab" disableRipple />
        ))}
    </Tabs>
);
