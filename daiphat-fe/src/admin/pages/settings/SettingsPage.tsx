"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { usePathname, useSearchParams } from "next/navigation";
import { Box } from "@mui/material";
import { useEffect, type ReactNode } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GeneralSettingTab } from "./components/GeneralSettingTab";
import { PolicySettingsTab } from "./components/PolicySettingsTab";
import { ContentPagesTab } from "./components/ContentPagesTab";
import { AppPasswordTab } from "./components/AppPasswordTab";
import { prefixAdmin, ROUTES } from "../../constants/routes";

type SettingSection = {
    path: string;
    title: string;
    component: ReactNode;
};

const SETTINGS_SECTIONS: Record<string, SettingSection> = {
    general: {
        path: "general",
        title: "Cài đặt chung & liên hệ",
        component: <GeneralSettingTab />,
    },
    policies: {
        path: "policies",
        title: "Điều khoản & chính sách",
        component: <PolicySettingsTab />,
    },
    content: {
        path: "content",
        title: "Quản lý trang tĩnh",
        component: <ContentPagesTab />,
    },
    "app-password": {
        path: "app-password",
        title: "Mật khẩu ứng dụng",
        component: <AppPasswordTab />,
    },
};

/** Old / removed paths → current standalone pages */
const PATH_REDIRECTS: Record<string, string> = {
    "page-privacy": "policies",
    "page-terms": "policies",
    "page-shipping": "policies",
    "page-returns": "policies",
    "page-about": "content",
    "page-faq": "content",
    // Removed from settings UI — send to general
    map: "general",
    point: "general",
    shipping: "general",
    payment: "general",
    social: "general",
};

export const SettingsPage = () => {
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const router = useAdminRouter();

    const currentPath = pathname.split("/").pop() ?? "general";
    const resolvedPath = PATH_REDIRECTS[currentPath] ?? currentPath;
    const section = SETTINGS_SECTIONS[resolvedPath] ?? SETTINGS_SECTIONS.general;

    useEffect(() => {
        if (currentPath !== section.path) {
            router.replace(`/${prefixAdmin}/dashboard/settings/${section.path}`);
        }
    }, [currentPath, section.path, router]);

    const breadcrumbs = [
        { label: "Dashboard", to: `/${prefixAdmin}` },
        { label: "Cài đặt", to: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
        { label: section.title },
    ];

    return (
        <Box>
            <PageHeader title={section.title} breadcrumbItems={breadcrumbs} />

            <Box sx={{ mt: 2 }}>{section.component}</Box>
        </Box>
    );
};
