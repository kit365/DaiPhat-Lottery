"use client";

import { ContractsSettingsTab } from "../ContractsSettingsTab";
import { SettingsPageShell } from "./SettingsPageShell";

export const ContractsSettingsPage = () => (
    <SettingsPageShell
        title="Hợp đồng"
        description="Quản lý mẫu hợp đồng cộng tác bán vé số và nhận thưởng. Bản isDefault được dùng khi in PDF thật."
    >
        <ContractsSettingsTab />
    </SettingsPageShell>
);
