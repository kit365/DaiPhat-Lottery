import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { PrizeStructureToolbar } from './PrizeStructureToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import {
    columnsPanelStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../shared/data-grid';
import { usePrizeStructuresByRegion } from '../../hooks/usePrizeStructure';
import { usePrizeStructureGridSettings } from '../../hooks/usePrizeStructureGridSettings';

export const PrizeStructureList = ({
    hook,
}: {
    hook: ReturnType<typeof usePrizeStructuresByRegion>;
}) => {
    const { settings, setSettings } = usePrizeStructureGridSettings();
    const { data, isLoading, error } = hook;
    const localeText = useDataGridLocale();

    return (
        <Card elevation={0} sx={{ height: 640, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {error ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className="text-[1.125rem]" style={{ color: 'var(--palette-error-main)' }}>
                            Lỗi khi tải danh sách. Vui lòng thử lại.
                        </span>
                    </Box>
                ) : (
                    <DataGrid
                        rows={data || []}
                        getRowId={(row) => row.id}
                        columns={columnsConfig}
                        density={settings.density}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        showToolbar
                        className="admin-datagrid"
                    sx={dataGridStyles}
                        slots={{
                            toolbar: PrizeStructureToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading
                                        ? <CircularProgress size={32} />
                                        : <span className="text-[1.125rem]">Không có dữ liệu</span>}
                                </Box>
                            ),
                        }}
                        slotProps={{
                            columnsManagement: {
                                getTogglableColumns: (columns: GridColDef[]) => columns.map(col => col.field),
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
                                filters: hook.filters,
                                onSearchChange: hook.setSearch,
                                onFilterChange: hook.setFilter,
                                onClearFilters: hook.clearFilters,
                            } as any,
                        }}
                        localeText={localeText}
                        pagination
                        paginationMode="client"
                        sortingMode="client"
                        loading={isLoading}
                        initialState={columnsInitialState}
                        getRowHeight={() => 'auto'}
                        disableRowSelectionOnClick
                    />
                )}
            </div>
        </Card>
    );
};
