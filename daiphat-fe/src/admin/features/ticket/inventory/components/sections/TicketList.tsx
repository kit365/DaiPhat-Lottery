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
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { TicketToolbar } from './TicketToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import type { useTicketInventory } from '../../hooks/useTicketInventory';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
    }
}

export const TicketList = ({
    ticketHook,
}: {
    ticketHook: ReturnType<typeof useTicketInventory>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        tickets,
        pagination,
        isLoading,
        error,
        filters,
        setFilter,
        clearFilters,
        setSearchFilter,
        setPage,
        setLimit,
    } = ticketHook;

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách vé số. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={dataGridContainerStyles}>
                <DataGrid
                    rows={tickets}
                    getRowId={(row) => row.id || row._id}
                    columns={columnsConfig}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: TicketToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
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
                            onFilterChange: setFilter,
                            onClearFilters: clearFilters,
                            onSearchChange: setSearchFilter,
                        } as any,
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    pagination
                    paginationMode="server"
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
