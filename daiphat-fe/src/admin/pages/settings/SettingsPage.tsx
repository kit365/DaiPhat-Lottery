"use client";

import { Box } from "@mui/material";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
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
    const location = useLocation();
    const navigate = useNavigate();

    const currentPath = location.pathname.split("/").pop() ?? "general";
    const resolvedPath = PATH_REDIRECTS[currentPath] ?? currentPath;
    const section = SETTINGS_SECTIONS[resolvedPath] ?? SETTINGS_SECTIONS.general;

    useEffect(() => {
        if (currentPath !== section.path) {
            navigate(`/${prefixAdmin}/dashboard/settings/${section.path}`, { replace: true });
        }
    }, [currentPath, section.path, navigate]);

    const breadcrumbs = [
        { label: "Dashboard", to: `/${prefixAdmin}` },
        { label: "Cài đặt", to: ROUTES.ADMIN.DASHBOARD.SETTINGS.GENERAL },
        { label: section.title },
    ];

    return (
        <Box>
            <Box sx={{ mb: 5 }}>
                <Title title={section.title} />
                <Breadcrumb items={breadcrumbs} />
            </Box>

            <Box sx={{ mt: 2 }}>{section.component}</Box>
        </Box>
    );
};
