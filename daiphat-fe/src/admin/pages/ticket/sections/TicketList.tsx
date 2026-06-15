import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { IGridSettings } from '../configs/types';
import { TicketToolbar } from './TicketToolbar';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useSettings } from '../hooks/useSettings';
import { useTicketColumns } from '../hooks/useTicketColumns';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    columnsPanelStyles,
    filterPanelStyles,
    dataGridStyles,
} from '../configs/styles.config';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import("react").Dispatch<import("react").SetStateAction<IGridSettings>>;
    }
}

export const TicketList = ({
    ticketHook,
}: {
    ticketHook: any;
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

    const columns = useTicketColumns();
    const localeText = useDataGridLocale();

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải danh sách vé số...</div>;
    }

    if (error) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải danh sách vé số. Vui lòng thử lại.</div>;
    }

    return (
        <Card
            elevation={0}
            sx={dataGridCardStyles}
        >
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={tickets}
                    columns={columns}
                    density={settings.density}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: TicketToolbar as any,
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
                            // Pass filter handlers to toolbar
                            filters,
                            onFilterChange: setFilter,
                            onClearFilters: clearFilters,
                            onSearchChange: setSearchFilter,
                        } as any,
                    }}
                    localeText={localeText}
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
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}
