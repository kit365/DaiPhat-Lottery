import { Toolbar, Box } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { Search } from '../../../../components/ui/Search';
import { Columns } from '../../../../components/ui/Columns';
import { SettingsList } from '../../../../components/ui/SettingsList';
import { IGridSettings, toolbarStyles } from '../../../../shared/data-grid';

interface SupplierToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: {
        search?: string;
    };
    onSearchChange: (search: string) => void;
}

export const SupplierToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onSearchChange,
}: SupplierToolbarProps) => {
    return (
        <Toolbar style={toolbarStyles.root}>
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo tên hoặc số điện thoại..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Columns />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
