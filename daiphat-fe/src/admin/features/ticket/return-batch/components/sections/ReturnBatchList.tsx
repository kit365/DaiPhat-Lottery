import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import {
    useSettings,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import type { useReturnBatchList } from '../../hooks/useReturnBatch';
import type { ReturnBatchStatus } from '../../types/returnBatch.type';
import { ReturnBatchToolbar } from './ReturnBatchToolbar';
import { returnBatchColumnsConfig, returnBatchColumnsInitialState } from '../configs/column.config';

export const ReturnBatchList = ({
    listHook,
}: {
    listHook: ReturnType<typeof useReturnBatchList>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        batches,
        pagination,
        isLoading,
        error,
        filters,
        setSearch,
        setStatus,
        setPage,
        setLimit,
    } = listHook;

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'status') {
            setStatus(values.length > 0 ? (values[0] as ReturnBatchStatus) : '');
        }
    };

    const handleClearFilters = () => {
        setStatus('');
        setSearch('');
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách phiếu trả vé. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={batches}
                    getRowId={(row) => row.id}
                    columns={returnBatchColumnsConfig}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    disableColumnMenu
                    disableColumnSorting
                    slots={{
                        toolbar: ReturnBatchToolbar as any,
                        noRowsOverlay: () => (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                }}
                            >
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
                            onFilterChange: handleFilterChange,
                            onClearFilters: handleClearFilters,
                            onSearchChange: setSearch,
                        } as any,
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
                    loading={isLoading}
                    rowCount={pagination?.totalRecords || 0}
                    paginationModel={{
                        page: (filters.page ?? 1) - 1,
                        pageSize: filters.size ?? 10,
                    }}
                    onPaginationModelChange={(model) => {
                        if (model.page + 1 !== (filters.page ?? 1)) {
                            setPage(model.page + 1);
                        }
                        if (model.pageSize !== (filters.size ?? 10)) {
                            setLimit(model.pageSize);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                    initialState={returnBatchColumnsInitialState}
                    getRowHeight={() => 'auto'}
                    disableRowSelectionOnClick
                    className="admin-datagrid"
                    sx={dataGridStyles}
                />
            </Box>
        </Card>
    );
};
