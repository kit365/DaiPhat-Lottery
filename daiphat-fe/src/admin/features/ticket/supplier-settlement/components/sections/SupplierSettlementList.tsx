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
    columnsPanelStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierSettlementToolbar } from './SupplierSettlementToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import type { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
    }
}

export const SupplierSettlementList = ({
    listHook,
}: {
    listHook: ReturnType<typeof useSupplierSettlementList>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setPage,
        setLimit,
        setSort,
    } = listHook;

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách đối soát nhà cung cấp. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DataGrid
                    rows={settlements}
                    getRowId={(row) => row.id}
                    columns={columnsConfig}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
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
                    paginationModel={{
                        page: filters.page - 1,
                        pageSize: filters.limit,
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
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    disableRowSelectionOnClick
                    className="admin-datagrid"
                    sx={dataGridStyles}
                />
            </Box>
        </Card>
    );
};
