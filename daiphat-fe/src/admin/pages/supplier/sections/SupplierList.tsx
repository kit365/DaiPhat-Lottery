import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useSettings } from '../../ticket/hooks/useSettings';
import {
    columnsPanelStyles,
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../ticket/configs/styles.config';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierToolbar } from './SupplierToolbar';
import type { useSupplierList } from '../hooks/useSupplierList';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: import('../../ticket/configs/types').IGridSettings;
        onSettingsChange: import('react').Dispatch<
            import('react').SetStateAction<import('../../ticket/configs/types').IGridSettings>
        >;
    }
}

export const SupplierList = ({
    supplierHook,
}: {
    supplierHook: ReturnType<typeof useSupplierList>;
}) => {
    const { settings, setSettings } = useSettings();
    const {
        suppliers,
        pagination,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setPage,
        setLimit,
        setSort,
    } = supplierHook;

    const localeText = useDataGridLocale();

    if (isLoading && suppliers.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>
                Đang tải danh sách nhà cung cấp...
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--palette-error-main)',
                    fontSize: '1.125rem',
                }}
            >
                Lỗi khi tải danh sách nhà cung cấp. Vui lòng thử lại.
            </div>
        );
    }

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <div style={dataGridContainerStyles}>
                <DataGrid
                    className="admin-datagrid"
                    rows={suppliers}
                    getRowId={(row) => row.id}
                    columns={columnsConfig}
                    density={settings.density}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: SupplierToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
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
                            onSearchChange: setSearchFilter,
                        } as any,
                    }}
                    localeText={{
                        ...localeText,
                        noRowsLabel: 'Không có dữ liệu',
                    }}
                    pagination
                    paginationMode="server"
                    sortingMode="server"
                    sortModel={
                        filters.sortBy
                            ? [{ field: filters.sortBy, sort: (filters.direction as 'asc' | 'desc') || 'asc' }]
                            : []
                    }
                    onSortModelChange={(newModel) => {
                        if (newModel.length > 0) {
                            setSort(newModel[0].field, newModel[0].sort || 'asc');
                        } else {
                            setSort('name', 'asc');
                        }
                    }}
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
                    sx={dataGridStyles}
                />
            </div>
        </Card>
    );
};
