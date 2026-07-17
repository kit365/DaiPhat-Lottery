import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { prefixAdmin } from '../../../../../constants/routes';
import { useTranslation } from 'react-i18next';
import { useExpiredTickets } from '../../hooks/useExpiredTickets';
import { dataGridStyles } from '../../../../../shared/data-grid';
import { DATA_GRID_LOCALE_VN } from '../../../../../../shared/components/DataTable/localeText.config';
import { useScanExpiredTickets } from '../../hooks/useTicket';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import SyncIcon from '@mui/icons-material/Sync';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../../assets/icons';
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
    const { t } = useTranslation();
    const {
        expiredTickets,
        pagination,
        isLoading,
        error,
        setPage,
        setLimit,
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Vé số hết hạn (Đã hủy)" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: t('admin.ticket.title.list'), to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Vé số hết hạn' },
                        ]}
                    />
                </div>
                <LoadingButton
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
            </div>

            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <DataGrid
                        rows={expiredTickets || []}
                        getRowId={(row) => row.id || row._id}
                        columns={expiredColumns}
                        localeText={DATA_GRID_LOCALE_VN}
                        slots={{
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
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
                        paginationModel={{
                            page: pagination.currentPage - 1,
                            pageSize: pagination.limit,
                        }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page + 1);
                            setLimit(model.pageSize);
                        }}
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
