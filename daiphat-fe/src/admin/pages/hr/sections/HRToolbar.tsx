import { Toolbar, Box } from "@mui/material";
import { GridToolbarQuickFilter } from "@mui/x-data-grid";
import { toolbarStyles } from "../configs/styles.config";

interface HRToolbarProps {
    searchPlaceholder?: string;
    children?: React.ReactNode;
}

export const HRToolbar = ({ searchPlaceholder = "Tìm kiếm...", children }: HRToolbarProps) => {
    return (
        <Toolbar sx={toolbarStyles.root}>
            <GridToolbarQuickFilter
                slotProps={{
                    root: {
                        placeholder: searchPlaceholder,
                        sx: {
                            minWidth: '240px',
                            '& .MuiInputBase-root': {
                                fontSize: '0.875rem',
                                height: '40px',
                                borderRadius: "var(--shape-borderRadius)",
                            },
                        }
                    } as any,
                }}
            />
            {children}
            <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
    );
};




