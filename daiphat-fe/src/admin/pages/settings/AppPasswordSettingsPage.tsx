"use client";

import { AppPasswordTab } from "./components/AppPasswordTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const AppPasswordSettingsPage = () => (
    <SettingsPageShell title="Mật khẩu ứng dụng">
        <AppPasswordTab />
    </SettingsPageShell>
);
