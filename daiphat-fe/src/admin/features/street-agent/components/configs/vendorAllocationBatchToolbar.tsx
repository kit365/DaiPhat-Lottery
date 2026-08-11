"use client";

import { Toolbar, Box } from "@mui/material";
import { Search } from "../../../../components/ui/Search";
import { Columns } from "../../../../components/ui/Columns";
import { SettingsList } from "../../../../components/ui/SettingsList";
import type { IGridSettings } from "../../../../shared/data-grid";

interface VendorAllocationBatchToolbarProps {
    settings: IGridSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (value: string) => void;
}

export const VendorAllocationBatchToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
}: VendorAllocationBatchToolbarProps) => (
    <Toolbar className="admin-list-toolbar">
        <Box className="admin-list-toolbar__search">
            <Search
                maxWidth="100%"
                placeholder="Tìm mã phiếu, người bán vé số..."
                value={search}
                onChange={onSearchChange}
            />
        </Box>
        <Box className="admin-list-toolbar__actions">
            <Columns />
            <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
        </Box>
    </Toolbar>
);
