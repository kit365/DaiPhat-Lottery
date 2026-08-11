"use client";

import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { StaticPageTab } from "./StaticPageTab";
import { POLICY_PAGE_KEYS } from "../services/staticPageService";

/** Hub tab: Điều khoản / Bảo mật / Vận chuyển / Đổi trả */
export const PolicySettingsTab = () => {
    const [index, setIndex] = useState(0);
    const active = POLICY_PAGE_KEYS[index] ?? POLICY_PAGE_KEYS[0];

    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Điều khoản, bảo mật và các chính sách liên quan — tab riêng, không gộp với Cài đặt
                chung.
            </Typography>
            <Tabs
                value={index}
                onChange={(_, v: number) => setIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                    mb: 3,
                    minHeight: 40,
                    borderBottom: 1,
                    borderColor: "divider",
                    "& .MuiTab-root": {
                        textTransform: "none",
                        fontWeight: 600,
                        minHeight: 40,
                        fontSize: "0.8125rem",
                    },
                    "& .Mui-selected": { color: "#00A76F" },
                    "& .MuiTabs-indicator": { backgroundColor: "#00A76F" },
                }}
            >
                {POLICY_PAGE_KEYS.map((page) => (
                    <Tab key={page.key} label={page.label} />
                ))}
            </Tabs>
            <StaticPageTab configKey={active.key} label={active.label} />
        </Box>
    );
};
