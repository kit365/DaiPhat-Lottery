import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { useSettings } from '../../../../pages/ticket/hooks/useSettings';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
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

    if (isLoading && (!data || data.length === 0)) {
        return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải danh sách kết quả...</div>;
    }

    if (error) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải danh sách. Vui lòng thử lại.</div>;
    }

    return (
        <>
            <Card elevation={0} className="admin-list-card admin-list-card--table">
                <div className="flex-1 w-full flex flex-col overflow-hidden min-h-0">
                    <DataGrid
                        rows={data || []}
                        getRowId={(row) => row.id}
                        columns={columnsConfig(onViewDetails)}
                        density={settings.density}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        slots={{
                            toolbar: DrawResultToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
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
                </div>
            </Card>
        </>
    );
};
