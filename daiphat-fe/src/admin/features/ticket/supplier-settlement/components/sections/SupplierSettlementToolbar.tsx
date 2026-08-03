import { Toolbar, Box } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { Search } from '../../../../../components/ui/Search';
import { Columns } from '../../../../../components/ui/Columns';
import { SettingsList } from '../../../../../components/ui/SettingsList';
import { IGridSettings, toolbarStyles } from '../../../../../shared/data-grid';

interface SupplierSettlementToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: {
        search?: string;
    };
    onSearchChange: (search: string) => void;
}

export const SupplierSettlementToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onSearchChange,
}: SupplierSettlementToolbarProps) => {
    return (
        <Toolbar style={toolbarStyles.root}>
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo tên hoặc mã nhà cung cấp..."
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
