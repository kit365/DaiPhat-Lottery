import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useTranslation } from "react-i18next";
import { useExpiredTickets } from "./hooks/useExpiredTickets";
import { useDataGridLocale } from "../../hooks/useDataGridLocale";
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    dataGridStyles
} from './configs/styles.config';

import { useScanExpiredTickets } from "./hooks/useTicket";
import { toast } from 'react-toastify';
import { LoadingButton } from "../../components/ui/LoadingButton";
import { Sync as SyncIcon } from '@mui/icons-material';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../assets/icons';

export const ExpiredTicketListPage = () => {
    const { t } = useTranslation();
    const {
        expiredTickets,
        pagination,
        isLoading,
        error,
        setPage,
        setLimit,
        refetch
    } = useExpiredTickets();
    const { mutate: scan, isPending: isScanning } = useScanExpiredTickets();
    const localeText = useDataGridLocale();

    const handleScan = () => {
        scan(undefined, {
            onSuccess: (res) => {
                toast.success(res.message);
                refetch();
            },
            onError: (err: any) => {
                toast.error(err.message || "Lỗi khi quét sản phẩm");
            }
        });
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Tên sản phẩm',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    {params.value}
                </div>
            )
        },
        {
            field: 'quantity',
            headerName: 'Số lượng hủy',
            width: 150,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <div style={{ color: 'var(--palette-error-main)', fontWeight: 700 }}>
                    {params.value}
                </div>
            )
        },
        {
            field: 'expiryDate',
            headerName: 'Ngày hết hạn',
            width: 180,
            renderCell: (params) => (
                <div style={{ color: 'var(--palette-text-secondary)' }}>
                    {params.value ? new Date(params.value).toLocaleDateString('vi-VN') : '-'}
                </div>
            )
        },
        {
            field: 'discardedAt',
            headerName: 'Thời điểm hủy',
            width: 200,
            renderCell: (params) => (
                <div style={{ color: 'var(--palette-text-disabled)', fontSize: '0.875rem' }}>
                    {new Date(params.value).toLocaleString('vi-VN')}
                </div>
            )
        },
    ];

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.125rem' }}>Đang tải dữ liệu...</div>;
    if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>Lỗi khi tải dữ liệu sản phẩm hết hạn.</div>;

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Sản phẩm hết hạn (Đã hủy)" />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: t("admin.ticket.title.list"), to: `/${prefixAdmin}/ticket/list` },
                            { label: "Sản phẩm hết hạn" }
                        ]}
                    />
                </div>
                <LoadingButton
                    variant="contained"
                    startIcon={<SyncIcon />}
                    onClick={handleScan}
                    loading={isScanning}
                    label="Quét sản phẩm hết hạn"
                    loadingLabel="Đang quét..."
                    sx={{
                        minHeight: "2.25rem",
                        padding: "var(--shape-borderRadius-sm) calc(2 * var(--spacing))",
                    }}
                />
            </div>

            <Card elevation={0} sx={dataGridCardStyles}>
                <div style={dataGridContainerStyles}>
                    <DataGrid
                        rows={expiredTickets || []}
                        columns={columns}
                        localeText={localeText}
                        slots={{
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                        }}
                        pagination
                        paginationMode="server"
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
                        sx={dataGridStyles}
                    />
                </div>
            </Card>
        </>
    );
};
