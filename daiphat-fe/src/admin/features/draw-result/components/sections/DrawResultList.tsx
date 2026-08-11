import type { GridColDef } from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { useSettings } from '../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { dataGridStyles } from '../../../../shared/data-grid';
import { DrawResultToolbar } from './DrawResultToolbar';

export const DrawResultList = ({
    data,
    isLoading,
    isRefreshing,
    error,
    onViewDetails,
    onSearch,
    region,
    dateMode,
    drawDate,
    fromDate,
    toDate,
    source,
    onRegionChange,
    onDateModeChange,
    onDrawDateChange,
    onFromDateChange,
    onToDateChange,
    onSourceChange
}: {
    data: any[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: any;
    onViewDetails: (id: number) => void;
    onSearch: (filter: any) => void;
    region: string;
    dateMode: 'single' | 'range';
    drawDate: string;
    fromDate: string;
    toDate: string;
    source: 'MINH_NGOC' | 'XOSO_VN';
    onRegionChange: (region: string) => void;
    onDateModeChange: (mode: 'single' | 'range') => void;
    onDrawDateChange: (drawDate: string) => void;
    onFromDateChange: (drawDate: string) => void;
    onToDateChange: (drawDate: string) => void;
    onSourceChange: (source: 'MINH_NGOC' | 'XOSO_VN') => void;
}) => {
    const { settings, setSettings } = useSettings();
    const localeText = useDataGridLocale();

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {error ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className="text-[1.125rem]" style={{ color: 'var(--palette-error-main)' }}>
                            Lỗi khi tải danh sách. Vui lòng thử lại.
                        </span>
                    </Box>
                ) : (
                    <LazyDataGrid
                        rows={data || []}
                        getRowId={(row) => row.id}
                        columns={columnsConfig(onViewDetails)}
                        density={settings.density}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        disableColumnMenu
                        disableColumnSorting
                        className="admin-datagrid"
                        sx={dataGridStyles}
                        slots={{
                            toolbar: DrawResultToolbar as any,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading
                                        ? <CircularProgress size={32} />
                                        : <span className="text-[1.125rem]">Không có dữ liệu</span>}
                                </Box>
                            ),
                        }}
                        slotProps={{
                            toolbar: {
                                settings,
                                onSettingsChange: setSettings,
                                onSearch,
                                region,
                                dateMode,
                                drawDate,
                                fromDate,
                                toDate,
                                source,
                                onRegionChange,
                                onDateModeChange,
                                onDrawDateChange,
                                onFromDateChange,
                                onToDateChange,
                                onSourceChange,
                                isLoading,
                                isRefreshing,
                            } as any,
                            columnsManagement: {
                                getTogglableColumns: (columns: GridColDef[]) => columns.map(col => col.field),
                            }
                        }}
                        localeText={localeText}
                        pagination
                        showToolbar
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
