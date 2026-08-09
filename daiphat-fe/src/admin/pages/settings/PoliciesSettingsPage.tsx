"use client";

import { PolicySettingsTab } from "./components/PolicySettingsTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const PoliciesSettingsPage = () => (
    <SettingsPageShell title="Điều khoản & chính sách">
        <PolicySettingsTab />
    </SettingsPageShell>
);
