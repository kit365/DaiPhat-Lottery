import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { PrizeStructureToolbar } from './PrizeStructureToolbar';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import {
    columnsPanelStyles,
    filterPanelStyles,
} from '../../../../pages/ticket/configs/styles.config';
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

    if (isLoading) {
        return <div className="p-10 text-center">Đang tải danh sách cơ cấu giải thưởng...</div>;
    }

    if (error) {
        return <div className="p-10 text-center text-[var(--palette-error-main)]">Lỗi khi tải danh sách. Vui lòng thử lại.</div>;
    }

    return (
        <Card elevation={0} className="admin-list-card admin-list-card--table">
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
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
                />
            </div>
        </Card>
    );
};
