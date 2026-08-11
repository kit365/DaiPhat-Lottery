import type {
    GridColDef,
} from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../../assets/icons';
import {
    IGridSettings,
    useSettings,
    adminDataGridRowHeightProps,
    adminDataGridRowHeightSx,
    ADMIN_DATAGRID_ROW_MIN_HEIGHT,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../../shared/data-grid';
import { columnsConfig, columnsInitialState } from '../configs/column.config';
import { SupplierSettlementToolbar } from './SupplierSettlementToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { useSupplierSettlementList } from '../../hooks/useSupplierSettlement';
import type { SupplierSettlementStatus } from '../../types/supplierSettlement.type';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
    }
}

import { useEffect } from 'react';
import { AppToast } from '../../../../../../utils/toast.util';
import { ExpiredReturnSettlementBanner } from './ExpiredReturnSettlementBanner';

export const SupplierSettlementList = ({
    listHook,
}: {
    listHook: ReturnType<typeof useSupplierSettlementList>;
}) => {
    const { settings, setSettings } = useSettings();
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
        setSort,
        paginationModel,
        onPaginationModelChange,
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Top Executive Warning Alert Banner if any settlement is return expired */}
            <ExpiredReturnSettlementBanner
                expiredCount={expiredCount}
                totalExpiredValue={totalExpiredSum}
                expiredItems={expiredItems}
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: expiredCount > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
                    },
                    gap: 2,
                    width: '100%',
                }}
            >
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
                        Số kỳ đối soát
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                        {pagination?.totalRecords || 0}
                    </Typography>
                </Card>

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
                        Tổng giá trị nhập
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                        {formatImportCost(totalImportSum)} VNĐ
                    </Typography>
                </Card>

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

            <Card
                elevation={0}
                className="admin-datagrid-card"
                sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    bgcolor: '#ffffff',
                    overflow: 'hidden',
                    height: 'auto !important',
                    minHeight: 'auto',
                }}
            >
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <LazyDataGrid
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
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, py: 5 }}>
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
                        paginationModel={paginationModel}
                        onPaginationModelChange={onPaginationModelChange}
                        pageSizeOptions={[5, 10, 20, 50]}
                        initialState={columnsInitialState}
                        getRowHeight={() => 'auto'}
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={{
                            ...dataGridStyles,
                            borderWidth: 0,
                            '& .MuiDataGrid-row': {
                                borderLeft: '3.5px solid transparent',
                                transition: 'all 0.15s ease',
                            },
                            '& .admin-datagrid-row-expired': {
                                borderLeft: '3.5px solid #f87171 !important',
                                bgcolor: 'rgba(254, 242, 242, 0.45) !important',
                            },
                            '& .admin-datagrid-row-expired .MuiDataGrid-cell': {
                                borderBottom: '1px solid rgba(254, 202, 202, 0.6) !important',
                            },
                            '& .admin-datagrid-row-expired:hover': {
                                bgcolor: 'rgba(254, 226, 226, 0.7) !important',
                            },
                            '& .admin-datagrid-row-expired:hover .MuiDataGrid-cell': {
                                bgcolor: 'transparent !important',
                            },
                        }}
                    />
                </Box>
            </Card>
        </Box>
    );
};
