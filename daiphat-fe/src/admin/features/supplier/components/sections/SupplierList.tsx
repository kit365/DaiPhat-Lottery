import type {
    GridColDef,
} from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import {
    IGridSettings,
    useSettings,
    adminDataGridRowHeightProps,
    adminDataGridRowHeightSx,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierToolbar } from './SupplierToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../shared/components/DataTable/localeText.config';
import type { useSupplierList } from '../../hooks/useSupplier';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
    }
}

export const SupplierList = ({
    supplierHook,
}: {
    supplierHook: ReturnType<typeof useSupplierList>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        suppliers,
        pagination,
        isLoading,
        error,
        filters,
        paginationModel,
        onPaginationModelChange,
        setSearchFilter,
        setSort,
    } = supplierHook;

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách nhà cung cấp. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={dataGridContainerStyles}>
                <LazyDataGrid
                    rows={suppliers}
                    getRowId={(row) => row.id}
                    columns={columnsConfig}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    disableColumnMenu
                    disableColumnSorting
                    slots={{
                        toolbar: SupplierToolbar as any,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <span className="admin-datagrid-empty">Không có dữ liệu</span>
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
                        } as any,
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    sortingMode="server"
                    sortModel={
                        filters.sortBy
                            ? [{ field: filters.sortBy, sort: (filters.direction as 'asc' | 'desc') || 'asc' }]
                            : []
                    }
                    onSortModelChange={(newModel) => {
                        if (newModel.length > 0) {
                            setSort(newModel[0].field, newModel[0].sort || 'asc');
                        } else {
                            setSort('name', 'asc');
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
                    } as import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>}
                />
            </Box>
        </Card>
    );
};
