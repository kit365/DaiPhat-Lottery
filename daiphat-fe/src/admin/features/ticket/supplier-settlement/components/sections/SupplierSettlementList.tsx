import {
    DataGrid,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { dataGridStyles } from '../../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierSettlementToolbar } from './SupplierSettlementToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';

export const SupplierSettlementList = ({
    listHook,
}: {
    listHook: ReturnType<typeof useSupplierSettlementList>;
}) => {
    const {
        allSettlements,
        settlements,
        pagination,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setStatusFilter,
        setExpiredOnlyFilter,
        setPage,
        setLimit,
        setSort,
    } = listHook;

    const sourceData = allSettlements.length > 0 ? allSettlements : settlements;
    const totalImportSum = sourceData.reduce((acc: number, curr: any) => acc + (curr.totalImportValue || 0), 0);
    const totalReturnSum = sourceData.reduce((acc: number, curr: any) => acc + (curr.totalReturnValue || 0), 0);
    const remainingSum = sourceData.reduce((acc: number, curr: any) => acc + (curr.remainingAmount || 0), 0);

    const expiredItems = sourceData.filter((s: any) => s.isReturnExpired);
    const expiredCount = expiredItems.length;
    const totalExpiredSum = expiredItems.reduce(
        (acc: number, curr: any) => acc + (curr.expiredReturnValue || curr.totalReturnValue || 0),
        0
    );

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách đối soát nhà cung cấp. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DataGrid
                    rows={settlements}
                    getRowId={(row) => row.id}
                    columns={columnsConfig}
                    density="comfortable"
                    showToolbar
                    disableColumnMenu
                    disableColumnSorting
                    slots={{
                        toolbar: SupplierSettlementToolbar as any,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {isLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                )}
                            </Box>
                        ),
                    }}
                    slotProps={{
                        toolbar: {
                            filters,
                            onSearchChange: setSearchFilter,
                        } as any,
                    }}
                >
                    <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                        Tổng giá trị nhập
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                        {formatImportCost(totalImportSum)} VNĐ
                    </Typography>
                </Card>

                {/* 3. Tổng giá trị trả */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: '16px',
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Typography variant="caption" fontWeight={600} color="#64748b" display="block">
                        Tổng giá trị trả
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                        {formatImportCost(totalReturnSum)} VNĐ
                    </Typography>
                </Card>

                {/* 4. Còn phải trả NCC */}
                <Card
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: '16px',
                        bgcolor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Typography variant="caption" fontWeight={700} color="#166534" display="block">
                        Còn phải trả NCC
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                        {formatImportCost(remainingSum)} VNĐ
                    </Typography>
                </Card>

                {/* 5. Giá trị quá hạn trả (Hiển thị khi có kỳ đối soát bị quá hạn) */}
                {expiredCount > 0 && (
                    <Card
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            bgcolor: '#fef2f2',
                            border: '1.5px solid #fecaca',
                            boxShadow: '0 2px 8px 0 rgba(239, 68, 68, 0.1)',
                        }}
                    >
                        <Typography variant="caption" fontWeight={800} color="#dc2626" display="flex" alignItems="center" gap={0.5}>
                            <span>🔴 Quá hạn trả vé ({expiredCount} kỳ)</span>
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#991b1b" sx={{ mt: 0.5 }}>
                            {formatImportCost(totalExpiredSum)} VNĐ
                        </Typography>
                    </Card>
                )}
            </Box>

            {/* Main DataGrid Card Container */}
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
                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <DataGrid
                        rows={settlements}
                        getRowId={(row) => row.id}
                        columns={columnsConfig}
                        density={settings.density || 'comfortable'}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        showToolbar
                        getRowClassName={(params) => (params.row.isReturnExpired ? 'admin-datagrid-row-expired' : '')}
                        slots={{
                            toolbar: SupplierSettlementToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? (
                                        <CircularProgress size={32} />
                                    ) : (
                                        <span className="admin-datagrid-empty">Không có dữ liệu đối soát</span>
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
                                expiredCount,
                                onSearchChange: setSearchFilter,
                                onStatusChange: setStatusFilter,
                                onExpiredOnlyToggle: setExpiredOnlyFilter,
                            } as any,
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        sortingMode="server"
                        sortModel={
                            filters.sortBy
                                ? [{ field: filters.sortBy, sort: (filters.direction as 'asc' | 'desc') || 'desc' }]
                                : []
                        }
                        onSortModelChange={(newModel) => {
                            if (newModel.length > 0) {
                                setSort(newModel[0].field, newModel[0].sort || 'desc');
                            } else {
                                setSort('periodFrom', 'desc');
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
                        className="admin-datagrid"
                        sx={{
                            ...dataGridStyles,
                            '& .MuiDataGrid-row': {
                                borderLeft: '5px solid transparent',
                            },
                            '& .admin-datagrid-row-expired': {
                                borderLeft: '5px solid #dc2626 !important',
                                transition: 'all 0.15s ease',
                            },
                            '& .admin-datagrid-row-expired .MuiDataGrid-cell': {
                                bgcolor: '#fef2f2 !important',
                                borderBottom: '1px solid #fecaca !important',
                            },
                            '& .admin-datagrid-row-expired:hover .MuiDataGrid-cell': {
                                bgcolor: '#ffe4e6 !important',
                            },
                        }}
                    />
                </Box>
            </Card>
        </Box>
    );
};
