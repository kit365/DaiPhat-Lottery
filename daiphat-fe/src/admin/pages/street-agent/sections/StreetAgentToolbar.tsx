import { Box } from "@mui/material";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { Search } from "../../../components/ui/Search";
import { toolbarStyles } from "../configs/styles.config";

interface StreetAgentToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
}

export const StreetAgentToolbar = ({ search, onSearchChange }: StreetAgentToolbarProps) => {
    return (
        <GridToolbarContainer>
            <Box sx={toolbarStyles.root}>
                <Search
                    value={search}
                    onChange={onSearchChange}
                    placeholder="Tìm kiếm theo tên, SĐT, CCCD..."
                />
            </Box>
        </GridToolbarContainer>
    );
};
