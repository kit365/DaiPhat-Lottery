"use client";

import { ContentPagesTab } from "../ContentPagesTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const ContentSettingsPage = () => (
    <SettingsPageShell title="Quản lý trang tĩnh">
        <ContentPagesTab />
    </SettingsPageShell>
);
