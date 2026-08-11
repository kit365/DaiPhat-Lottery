"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";
import type { ComponentType } from "react";
import type { DataGridProps, GridValidRowModel } from "@mui/x-data-grid";

const DataGridComponent = dynamic(
    () => import("@mui/x-data-grid").then((mod) => mod.DataGrid),
    {
        ssr: false,
        loading: () => (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 280,
                    width: "100%",
                }}
            >
                <CircularProgress size={32} />
            </Box>
        ),
    },
);

export function LazyDataGrid<R extends GridValidRowModel>(props: DataGridProps<R>) {
    const Component = DataGridComponent as ComponentType<DataGridProps<R>>;
    return <Component {...props} />;
}
