import { Toolbar, Box } from "@mui/material";
import { type Dispatch, type SetStateAction } from "react";
import { Search } from "../../../components/ui/Search";
import { Columns } from "../../../components/ui/Columns";
import { ExportButton } from "../../../components/ui/ExportButton";
import { SettingsList } from "../../../components/ui/SettingsList";
import { toolbarStyles } from "../configs/styles.config";
import { IGridSettings } from "../../ticket/configs/types";

interface RefundToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (search: string) => void;
}

export const RefundToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
}: RefundToolbarProps) => {
    return (
        <Toolbar
            style={toolbarStyles.root}
            sx={{
                justifyContent: 'space-between',
                padding: '20px !important',
                gap: 2
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo mã đơn, khách hàng, lý do hoàn tiền..."
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Columns />
                <ExportButton />
                <SettingsList
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
            </Box>
        </Toolbar>
    );
};
