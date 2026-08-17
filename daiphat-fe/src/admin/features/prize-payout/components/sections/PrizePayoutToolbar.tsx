"use client";

import { Box, Toolbar } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { Search } from '@/admin/components/ui/Search';
import { SettingsList } from '@/admin/components/ui/SettingsList';
import { toolbarStyles, type IGridSettings } from '@/admin/shared/data-grid';

interface PrizePayoutToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (search: string) => void;
}

export const PrizePayoutToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
}: PrizePayoutToolbarProps) => {
    return (
        <Toolbar
            style={toolbarStyles.root}
            sx={{
                justifyContent: 'space-between',
                padding: '20px !important',
                gap: 2,
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo mã yêu cầu, tên khách hàng..."
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
