import { Box, Toolbar } from '@mui/material';
import { Search } from '../../../components/ui/Search';
import { toolbarStyles } from '../../../shared/data-grid';

interface PrizePayoutToolbarProps {
    search: string;
    onSearchChange: (search: string) => void;
}

export const PrizePayoutToolbar = ({ search, onSearchChange }: PrizePayoutToolbarProps) => {
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
        </Toolbar>
    );
};
