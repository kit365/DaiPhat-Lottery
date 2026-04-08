import { Toolbar, Box } from "@mui/material";
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
import { STATUS_OPTIONS } from "../configs/constants";
import { toolbarStyles } from "../configs/styles.config";
import { ExportImport } from "../../../components/ui/ExportImport";

export const AccountAdminToolbar = () => {
    return (
        <Toolbar sx={{
            ...toolbarStyles.root,
            borderBottom: '1px dashed var(--palette-text-disabled)33',
            mb: 1
        }}>
            <Box sx={{ display: 'flex', gap: 2, w: 'full', alignItems: 'center', width: '100%' }}>
                <SelectMulti
                    label="Trạng thái"
                    options={STATUS_OPTIONS}
                    sx={{ minWidth: 160 }}
                />
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Search
                        maxWidth="100%"
                        placeholder="Tìm kiếm tài khoản..."
                    />
                    <ExportImport />
                </Box>
            </Box>
        </Toolbar>
    );
};




