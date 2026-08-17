"use client";

import { ContentPagesTab } from "../ContentPagesTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const ContentSettingsPage = () => {
    return (
        <SettingsPageShell title="Trang thông tin">
            <ContentPagesTab />
        </SettingsPageShell>
    );
};
