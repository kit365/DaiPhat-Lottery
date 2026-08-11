"use client";

import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { StaticPageTab } from "./StaticPageTab";
import { CONTENT_PAGE_KEYS } from "../services/staticPageService";

/** Hub: Giới thiệu / FAQ / Liên hệ / Tuyển dụng / Hướng dẫn */
export const ContentPagesTab = () => {
    const [index, setIndex] = useState(0);
    const active = CONTENT_PAGE_KEYS[index] ?? CONTENT_PAGE_KEYS[0];

    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                Nội dung các trang thông tin trên website (Giới thiệu, FAQ, Liên hệ, Tuyển dụng,
                Hướng dẫn) — hiển thị từ footer “Về chúng tôi / Hướng dẫn”.
            </Typography>
            <Tabs
                value={index}
                onChange={(_, v: number) => setIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
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
                {CONTENT_PAGE_KEYS.map((page) => (
                    <Tab key={page.key} label={page.label} />
                ))}
            </Tabs>
            <StaticPageTab configKey={active.key} label={active.label} />
        </Box>
    );
};
