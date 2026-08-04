import { Toolbar, Box } from '@mui/material';
import { Search } from '../../../../../components/ui/Search';
import { toolbarStyles } from '../../../../../shared/data-grid';

interface SupplierSettlementToolbarProps {
    filters: {
        search?: string;
    };
    onSearchChange: (search: string) => void;
}

export const SupplierSettlementToolbar = ({
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
        </Toolbar>
    );
};
