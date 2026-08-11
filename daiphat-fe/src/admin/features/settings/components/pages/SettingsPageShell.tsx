"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { PageHeader } from "@/admin/components/ui/PageHeader";
import { prefixAdmin, ROUTES } from "@/admin/constants/routes";

type SettingsPageShellProps = {
    title: string;
    children: ReactNode;
};

export const SettingsPageShell = ({ title, children }: SettingsPageShellProps) => {
    const breadcrumbs = [
        { label: "Dashboard", to: `/${prefixAdmin}` },
        { label: "Cài đặt", to: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
        { label: title },
    ];

    return (
        <Box>
            <PageHeader title={title} breadcrumbItems={breadcrumbs} />
            <Box sx={{ mt: 2 }}>{children}</Box>
        </Box>
    );
};
