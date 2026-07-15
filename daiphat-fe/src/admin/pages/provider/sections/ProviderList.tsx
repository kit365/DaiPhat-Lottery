import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { IGridSettings } from '../../ticket/configs/types';
import { ProviderToolbar } from './ProviderToolbar';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useSettings } from '../../ticket/hooks/useSettings';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles,
} from '../configs/styles.config';
import {
    columnsPanelStyles,
    filterPanelStyles,
} from '../../ticket/configs/styles.config';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import("react").Dispatch<import("react").SetStateAction<IGridSettings>>;
    }
}

export const ProviderList = ({
    providerHook,
}: {
    providerHook: any;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        providers,
        pagination,
        isLoading,
        isFetching,
        error,
        filters,
        setFilter,
        clearFilters,
        setSearchFilter,
        setPage,
        setLimit,
    } = providerHook;

    const localeText = useDataGridLocale();
    const isInitialLoading = isLoading && providers.length === 0 && !error;

    if (isInitialLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải danh sách nhà đài...</div>;
    }

    if (error && providers.length === 0) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải danh sách nhà đài. Vui lòng thử lại.</div>;
    }

    return (
        <Card
            elevation={0}
            sx={dataGridCardStyles}
        >
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={providers}
                    getRowId={(row) => row._id || row.id}
                    columns={columnsConfig}
                    density={settings.density}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: ProviderToolbar as any,
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
                        } as any,
                    }}
                    localeText={localeText}
                    pagination
                    paginationMode="server"
                    // Do not pass controlled sortModel={[]} — a new [] each render
                    // fires sortModelChange and MUI resets page to 0.
                    disableColumnSorting
                    loading={Boolean(isFetching)}
                    rowCount={Number(pagination?.totalRecords) || 0}
                    paginationModel={{
                        page: Math.max(0, (filters.page || 1) - 1),
                        pageSize: filters.limit || 10,
                    }}
                    onPaginationModelChange={(model) => {
                        const nextPage = model.page + 1;
                        const nextPageSize = model.pageSize;
                        if (nextPageSize !== filters.limit) {
                            setLimit(nextPageSize);
                            return;
                        }
                        if (nextPage !== filters.page) {
                            setPage(nextPage);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                    initialState={columnsInitialState}
                    getRowHeight={() => 'auto'}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    )
}
