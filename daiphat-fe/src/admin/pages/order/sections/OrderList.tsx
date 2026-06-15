import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Card, Tabs, Tab, Box, Typography, styled } from '@mui/material';

const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm)",
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { OrderToolbar } from './OrderToolbar';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useSettings } from '../../ticket/hooks/useSettings';
import { useOrderColumns, STATUS_LABEL_MAP } from '../hooks/useOrderColumns';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    columnsPanelStyles,
    filterPanelStyles,
    dataGridStyles,
} from '../../ticket/configs/styles.config';

import { useAdminOrderList } from '../hooks/useOrderManagement';

export const OrderList = () => {
    const { settings, setSettings } = useSettings();
    const orderHook = useAdminOrderList();
    const {
        orders,
        pagination,
        isLoading,
        error,
        filters,
        setFilter,
        clearFilters,
        setSearchFilter,
        setPage,
        setLimit,
        sortByUI,
        setSortBy,
        statusCounts = {},
    } = orderHook;

    const tabStatus = Array.isArray(filters.status)
        ? (filters.status[0] || 'all')
        : (filters.status || 'all');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setFilter('status', newValue === 'all' ? [] : [newValue]);
    };

    const TABS = [
        { value: 'all', label: 'Tất cả', color: 'var(--palette-common-white)', bg: 'var(--palette-grey-800)', activeColor: 'var(--palette-common-white)', activeBg: 'var(--palette-grey-800)' },
        { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán', color: 'var(--palette-warning-dark)', bg: 'var(--palette-warning-lighter)', activeColor: 'var(--palette-warning-contrastText)', activeBg: 'var(--palette-warning-main)' },
        { value: 'PAID', label: 'Đã thanh toán', color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)', activeColor: 'var(--palette-success-contrastText)', activeBg: 'var(--palette-success-main)' },
        { value: 'PREPARING', label: 'Đang chuẩn bị', color: 'var(--palette-info-dark)', bg: 'var(--palette-info-lighter)', activeColor: 'var(--palette-info-contrastText)', activeBg: 'var(--palette-info-main)' },
        { value: 'PENDING_PICKUP', label: 'Chờ nhận vé', color: 'var(--palette-primary-dark)', bg: 'var(--palette-primary-lighter)', activeColor: 'var(--palette-primary-contrastText)', activeBg: 'var(--palette-primary-main)' },
        { value: 'COMPLETED', label: 'Hoàn thành', color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)', activeColor: 'var(--palette-success-contrastText)', activeBg: 'var(--palette-success-main)' },
        { value: 'CANCELLED', label: 'Đã huỷ', color: 'var(--palette-error-dark)', bg: 'var(--palette-error-lighter)', activeColor: 'var(--palette-error-contrastText)', activeBg: 'var(--palette-error-main)' },
    ];

    const safeStatusCounts = statusCounts || {};
    const totalCount = Object.keys(safeStatusCounts)
        .filter(key => key !== 'all')
        .reduce((sum, key) => sum + (Number(safeStatusCounts[key]) || 0), 0);
    safeStatusCounts['all'] = safeStatusCounts['all'] ?? totalCount;

    const columns = useOrderColumns();
    const localeText = useDataGridLocale();

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải danh sách đơn hàng...</div>;
    }

    if (error) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải danh sách đơn hàng. Vui lòng thử lại.</div>;
    }

    return (
        <Card
            elevation={0}
            sx={{
                ...dataGridCardStyles,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Tabs
                value={tabStatus}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: "48px",
                    borderBottom: `1px solid var(--palette-background-neutral)`,
                    '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                {TABS.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        disableRipple
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: tabStatus === tab.value ? 700 : 500,
                                    color: tabStatus === tab.value ? 'var(--palette-text-primary)' : 'inherit',
                                    transition: 'color 0.2s ease',
                                }}>
                                    {tab.label}
                                </Typography>
                                <TabBadge
                                    sx={{
                                        bgcolor: tabStatus === tab.value ? tab.activeBg : tab.bg,
                                        color: tabStatus === tab.value ? tab.activeColor : tab.color,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {safeStatusCounts[tab.value] || 0}
                                </TabBadge>
                            </Box>
                        }
                        sx={{
                            minWidth: 0,
                            padding: '0',
                            minHeight: '48px',
                            textTransform: 'none',
                            color: 'var(--palette-text-secondary)',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)'
                            },
                        }}
                    />
                ))}
            </Tabs>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={orders}
                    columns={columns}
                    density={settings?.density || 'standard'}
                    showCellVerticalBorder={settings?.showCellBorders}
                    showColumnVerticalBorder={settings?.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: OrderToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                    }}
                    slotProps={{
                        columnsManagement: {
                            getTogglableColumns: (columns: GridColDef[]) =>
                                columns.filter(col => col.field !== '__check__' && col.field !== 'actions')
                                    .map(col => col.field),
                        },
                        columnsPanel: {
                            sx: columnsPanelStyles,
                        },
                        filterPanel: {
                            sx: filterPanelStyles,
                        },
                        toolbar: {
                            settings,
                            onSettingsChange: setSettings,
                            filters,
                            onFilterChange: setFilter,
                            onClearFilters: clearFilters,
                            onSearchChange: setSearchFilter,
                            sortByUI,
                            onSortChange: setSortBy,
                        } as any,
                    }}
                    localeText={localeText}
                    pagination
                    paginationMode="server"
                    loading={isLoading}
                    rowCount={pagination?.totalRecords || 0}
                    paginationModel={{
                        page: (filters.page || 1) - 1,
                        pageSize: filters.limit || 10,
                    }}
                    onPaginationModelChange={(model) => {
                        if (model.page + 1 !== filters.page) {
                            setPage(model.page + 1);
                        }
                        if (model.pageSize !== filters.limit) {
                            setLimit(model.pageSize);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}
