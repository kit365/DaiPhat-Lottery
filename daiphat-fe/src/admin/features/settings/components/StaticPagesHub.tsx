"use client";

import { Box } from "@mui/material";
import { useState } from "react";
import { StaticPageTab } from "./StaticPageTab";
import { SettingsContentTabs } from "./SettingsContentTabs";
import { StaticPageConfigKey } from "../services/staticPageService";

type StaticPagesHubProps = {
    pages: { key: StaticPageConfigKey; label: string }[];
};

export const StaticPagesHub = ({ pages }: StaticPagesHubProps) => {
    const [index, setIndex] = useState(0);
    const active = pages[index] ?? pages[0];

    if (!active) return null;

    return (
        <Box>
            <SettingsContentTabs
                value={index}
                labels={pages.map((page) => page.label)}
                onChange={setIndex}
            />
            <StaticPageTab configKey={active.key} label={active.label} />
        </Box>
    );
};
