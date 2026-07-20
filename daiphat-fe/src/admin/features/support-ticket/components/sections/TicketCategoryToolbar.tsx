import { Toolbar, Box } from '@mui/material';
import { IGridSettings } from '../../../../shared/data-grid';
import { Search } from '../../../../components/ui/Search';
import { Columns } from '../../../../components/ui/Columns';
import { SettingsList } from '../../../../components/ui/SettingsList';
import type { Dispatch, SetStateAction } from 'react';

interface ToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    searchTerm: string;
    onSearchChange: (search: string) => void;
}

export const TicketCategoryToolbar = ({
    settings,
    onSettingsChange,
    searchTerm,
    onSearchChange,
}: ToolbarProps) => {
    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm kiếm mã hoặc tên danh mục..."
                    value={searchTerm || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                <Columns />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
