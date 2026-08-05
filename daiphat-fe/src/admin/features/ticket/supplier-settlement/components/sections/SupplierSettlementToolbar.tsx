import { Toolbar, Box } from '@mui/material';
import { Search } from '../../../../../components/ui/Search';
import { toolbarStyles } from '../../../../../shared/data-grid';

interface SupplierSettlementToolbarProps {
    filters: {
        search?: string;
        status?: SupplierSettlementStatus;
        expiredOnly?: boolean;
    };
    expiredCount?: number;
    onSearchChange: (search: string) => void;
    onStatusChange?: (status?: SupplierSettlementStatus) => void;
    onExpiredOnlyToggle?: () => void;
}

export const SupplierSettlementToolbar = ({
    filters,
    expiredCount = 0,
    onSearchChange,
    onStatusChange,
    onExpiredOnlyToggle,
}: SupplierSettlementToolbarProps) => {
    const statusOptions: { label: string; value?: SupplierSettlementStatus }[] = [
        { label: 'Tất cả', value: undefined },
        { label: 'Đang mở', value: 'OPEN' as SupplierSettlementStatus },
        { label: 'Đã đóng', value: 'CLOSED' as SupplierSettlementStatus },
    ];

    return (
        <Toolbar
            style={toolbarStyles.root}
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: 2,
            }}
        >
            {/* Quick Status Pills */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {statusOptions.map((opt) => {
                    const isSelected = !filters.expiredOnly && filters.status === opt.value;
                    return (
                        <Chip
                            key={opt.label}
                            label={opt.label}
                            onClick={() => onStatusChange?.(opt.value)}
                            sx={{
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.8125rem',
                                bgcolor: isSelected ? '#0f172a' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#475569',
                                border: '1px solid',
                                borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                                '&:hover': {
                                    bgcolor: isSelected ? '#1e293b' : '#e2e8f0',
                                },
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            size="small"
                        />
                    );
                })}
            </Box>

            {/* Search Input */}
            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '280px' } }}>
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
