import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../../assets/icons';
import {
    IGridSettings,
    useSettings,
    adminDataGridRowHeightProps,
    adminDataGridRowHeightSx,
    ADMIN_DATAGRID_ROW_MIN_HEIGHT,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierSettlementToolbar } from './SupplierSettlementToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import type { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';
import type { SupplierSettlementStatus } from '../../types/supplierSettlement.type';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
    }
}

import { ExpiredReturnSettlementBanner } from './ExpiredReturnSettlementBanner';

export const SupplierSettlementList = ({
    listHook,
}: {
    listHook: ReturnType<typeof useSupplierSettlementList>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        allSettlements,
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setStatusFilter,
        paginationModel,
        onPaginationModelChange,
        setSort,
    } = listHook;

    const sourceData = allSettlements.length > 0 ? allSettlements : settlements;

    const expiredItems = sourceData.filter((s: any) => s.isReturnExpired);
    const expiredCount = expiredItems.length;
    const totalExpiredSum = expiredItems.reduce(
        (acc: number, curr: any) => acc + (curr.expiredReturnValue || curr.totalReturnValue || 0),
        0
    );

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'status') {
            setStatusFilter(values.length > 0 ? (values[0] as SupplierSettlementStatus) : undefined);
        }
    };

    const handleClearFilters = () => {
        setStatusFilter(undefined);
        setSearchFilter('');
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách đối soát nhà cung cấp. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            {/* Top Executive Warning Alert Banner if any settlement is return expired */}
            <ExpiredReturnSettlementBanner
                expiredCount={expiredCount}
                totalExpiredValue={totalExpiredSum}
                expiredItems={expiredItems}
            />

            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={dataGridContainerStyles}>
                    <DataGrid
                        rows={settlements}
                        getRowId={(row) => row.id}
                        columns={columnsConfig}
                        density={settings.density || 'comfortable'}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        showToolbar
                        getRowClassName={(params) => (params.row.isReturnExpired ? 'admin-datagrid-row-expired' : '')}
                        slots={{
                            toolbar: SupplierSettlementToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? (
                                        <CircularProgress size={32} />
                                    ) : (
                                        <span className="admin-datagrid-empty">Không có dữ liệu đối soát</span>
                                    )}
                                </Box>
                            ),
                        }}
                        slotProps={{
                            columnsManagement: {
                                getTogglableColumns: (columns: GridColDef[]) =>
                                    columns
                                        .filter((col) => col.field !== 'actions')
                                        .map((col) => col.field),
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
                                onSearchChange: setSearchFilter,
                                onFilterChange: handleFilterChange,
                                onClearFilters: handleClearFilters,
                            } as any,
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        sortingMode="server"
                        sortModel={
                            filters.sortBy
                                ? [{ field: filters.sortBy, sort: (filters.direction as 'asc' | 'desc') || 'desc' }]
                                : []
                        }
                        onSortModelChange={(newModel) => {
                            if (newModel.length > 0) {
                                setSort(newModel[0].field, newModel[0].sort || 'desc');
                            } else {
                                setSort('periodFrom', 'desc');
                            }
                        }}
                        loading={isLoading}
                        rowCount={pagination?.totalRecords || 0}
                        paginationModel={paginationModel}
                        onPaginationModelChange={onPaginationModelChange}
                        pageSizeOptions={[5, 10, 20, 50]}
                        initialState={columnsInitialState}
                        {...adminDataGridRowHeightProps}
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={{
                            ...dataGridStyles,
                            ...adminDataGridRowHeightSx,
                            '& .MuiDataGrid-row': {
                                minHeight: `${ADMIN_DATAGRID_ROW_MIN_HEIGHT}px !important`,
                                borderLeft: '5px solid transparent',
                            },
                            '& .admin-datagrid-row-expired': {
                                borderLeft: '5px solid #dc2626 !important',
                                transition: 'all 0.15s ease',
                            },
                            '& .admin-datagrid-row-expired .MuiDataGrid-cell': {
                                bgcolor: '#fef2f2 !important',
                                borderBottom: '1px solid #fecaca !important',
                            },
                            '& .admin-datagrid-row-expired:hover .MuiDataGrid-cell': {
                                bgcolor: '#ffe4e6 !important',
                            },
                        } as import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>}
                    />
                </Box>
            </Card>
        </Box>
    );
};
