import type { GridColDef } from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../../assets/icons';
import {
    useSettings,
    adminDataGridRowHeightProps,
    adminDataGridRowHeightSx,
    ADMIN_DATAGRID_ROW_MIN_HEIGHT,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
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
        paginationModel,
        onPaginationModelChange,
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            <Card
                elevation={0}
                className="admin-datagrid-card"
                sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    bgcolor: '#ffffff',
                    overflow: 'hidden',
                }}
            >
                <Box sx={dataGridContainerStyles}>
                    <LazyDataGrid
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
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: 240,
                                        py: 5,
                                    }}
                                >
                                    {isLoading ? (
                                        <CircularProgress size={32} />
                                    ) : (
                                        <span className="admin-datagrid-empty">Không có dữ liệu phiếu trả vé</span>
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
                        paginationModel={paginationModel}
                        onPaginationModelChange={onPaginationModelChange}
                        pageSizeOptions={[5, 10, 20, 50]}
                        initialState={returnBatchColumnsInitialState}
                        {...adminDataGridRowHeightProps}
                        getRowClassName={(params) =>
                            `return-batch-row-status-${(params.row.status || 'unknown').toLowerCase()}`
                        }
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={{
                            ...dataGridStyles,
                            ...adminDataGridRowHeightSx,
                            '& .MuiDataGrid-row': {
                                minHeight: `${ADMIN_DATAGRID_ROW_MIN_HEIGHT}px !important`,
                                borderLeft: '4px solid transparent',
                                transition: 'all 0.15s ease',
                            },
                            '& .return-batch-row-status-pending_inspection': {
                                borderLeft: '4px solid #f59e0b !important',
                            },
                            '& .return-batch-row-status-inspecting': {
                                borderLeft: '4px solid #0284c7 !important',
                            },
                            '& .return-batch-row-status-pending_handover': {
                                borderLeft: '4px solid #ea580c !important',
                            },
                            '& .return-batch-row-status-handed_over': {
                                borderLeft: '4px solid #22c55e !important',
                            },
                            '& .return-batch-row-status-cancelled': {
                                borderLeft: '4px solid #ef4444 !important',
                            },
                        } as import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>}
                    />
                </Box>
            </Card>
        </Box>
    );
};
