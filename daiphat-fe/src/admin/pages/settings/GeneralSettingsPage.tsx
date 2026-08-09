"use client";

import { GeneralSettingTab } from "./components/GeneralSettingTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const GeneralSettingsPage = () => (
    <SettingsPageShell title="Cài đặt chung & liên hệ">
        <GeneralSettingTab />
    </SettingsPageShell>
);
