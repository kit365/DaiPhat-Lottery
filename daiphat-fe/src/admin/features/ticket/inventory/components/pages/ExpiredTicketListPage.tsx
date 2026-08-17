"use client";

import type {
    GridColDef,
} from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { prefixAdmin } from '../../../../../constants/routes';
import { useExpiredTickets } from '../../hooks/useExpiredTickets';
import { dataGridStyles } from '../../../../../shared/data-grid';
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
import { useScanExpiredTickets } from '../../hooks/useTicket';
import { toast } from 'react-toastify';
import { Button } from '../../../../../components/ui/Button';
import SyncIcon from '@mui/icons-material/Sync';
import dayjs from 'dayjs';

const expiredColumns: GridColDef[] = [
    {
        field: 'name',
        headerName: 'Nhà đài',
        flex: 1,
        minWidth: 200,
        renderCell: (params) => <span className="admin-cell-title">{params.value}</span>,
    },
    {
        field: 'quantity',
        headerName: 'Số lượng hủy',
        width: 150,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <span className="admin-cell-text" style={{ color: 'var(--palette-error-main)', fontWeight: 700 }}>
                {params.value}
            </span>
        ),
    },
    {
        field: 'expiryDate',
        headerName: 'Ngày hết hạn',
        width: 180,
        renderCell: (params) => (
            <span className="admin-cell-date">
                {params.value ? dayjs(params.value).format('DD/MM/YYYY') : '-'}
            </span>
        ),
    },
    {
        field: 'discardedAt',
        headerName: 'Thời điểm hủy',
        width: 200,
        renderCell: (params) => (
            <span className="admin-cell-date-secondary">
                {params.value ? dayjs(params.value).format('DD/MM/YYYY HH:mm') : '-'}
            </span>
        ),
    },
];

export const ExpiredTicketListPage = () => {
    const {
        expiredTickets,
        pagination,
        isLoading,
        error,
        paginationModel,
        onPaginationModelChange,
        refetch,
    } = useExpiredTickets();
    const { mutate: scan, isPending: isScanning } = useScanExpiredTickets();

    const handleScan = () => {
        scan(undefined, {
            onSuccess: (res) => {
                toast.success(res.message);
                refetch();
            },
            onError: (err: any) => {
                toast.error(err.message || 'Lỗi khi quét vé số');
            },
        });
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải dữ liệu vé số hết hạn.
            </Box>
        );
    }

    return (
        <>
            <PageHeader
                title="Vé số hết hạn (Đã hủy)"
                breadcrumbItems={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Danh sách vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Vé số hết hạn' },
                        ]}
                action={
                    <Button
                    variant="contained"
                    startIcon={<SyncIcon />}
                    onClick={handleScan}
                    loading={isScanning}
                    label="Quét vé số hết hạn"
                    loadingLabel="Đang quét..."
                    sx={{
                        minHeight: '2.25rem',
                        padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                    }}
                />
                }
            />

            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <LazyDataGrid
                        rows={expiredTickets || []}
                        getRowId={(row) => row.id || row._id}
                        columns={expiredColumns}
                        localeText={DATA_GRID_LOCALE_VN}
                        disableColumnMenu
                        disableColumnSorting
                        slots={{
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
                        pagination
                        paginationMode="server"
                        loading={isLoading}
                        rowCount={pagination.totalRecords}
                        paginationModel={paginationModel}
                        onPaginationModelChange={onPaginationModelChange}
                        pageSizeOptions={[5, 10, 20, 50]}
                        getRowHeight={() => 'auto'}
                        checkboxSelection
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={dataGridStyles}
                    />
                </Box>
            </Card>
        </>
    );
};
