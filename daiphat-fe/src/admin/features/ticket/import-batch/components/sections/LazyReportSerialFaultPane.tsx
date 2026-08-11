"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";
import type { ComponentProps } from "react";

const ReportSerialFaultPane = dynamic(
    () =>
        import("./ReportSerialFaultPane").then((mod) => mod.ReportSerialFaultPane),
    {
        ssr: false,
        loading: () => (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 360,
                    width: "100%",
                }}
            >
                <CircularProgress size={32} />
            </Box>
        ),
    },
);

type LazyReportSerialFaultPaneProps = ComponentProps<typeof ReportSerialFaultPane>;

export function LazyReportSerialFaultPane(props: LazyReportSerialFaultPaneProps) {
    return <ReportSerialFaultPane {...props} />;
}
