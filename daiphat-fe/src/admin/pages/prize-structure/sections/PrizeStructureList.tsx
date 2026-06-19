import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useSettings } from '../../ticket/hooks/useSettings';
import { PrizeStructureToolbar } from './PrizeStructureToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles,
} from '../../provider/configs/styles.config';
import {
    columnsPanelStyles,
    filterPanelStyles,
} from '../../ticket/configs/styles.config';

export const PrizeStructureList = ({
    hook,
}: {
    hook: any;
}) => {
    const { settings, setSettings } = useSettings();
    const { data, isLoading, error, search, setSearch, page, setPage, limit, setLimit, totalRecords } = hook;
    const localeText = useDataGridLocale();

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải danh sách cơ cấu giải thưởng...</div>;
    }

    if (error) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải danh sách. Vui lòng thử lại.</div>;
    }

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={data || []}
                    getRowId={(row) => row.id}
                    columns={columnsConfig}
                    density={settings.density}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: PrizeStructureToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
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
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    );
};
