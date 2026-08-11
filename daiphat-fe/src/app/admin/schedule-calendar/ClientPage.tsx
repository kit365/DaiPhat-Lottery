"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";
import { createAdminClientPage } from "@/admin/lib/createAdminClientPage";

const ScheduleCalendarPage = dynamic(
    () =>
        import("@/admin/pages/hr/ScheduleCalendarPage").then(
            (mod) => mod.ScheduleCalendarPage,
        ),
    {
        ssr: false,
        loading: () => (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 480,
                }}
            >
                <CircularProgress />
            </Box>
        ),
    },
);

export const ClientPage = createAdminClientPage({
    component: ScheduleCalendarPage,
});
