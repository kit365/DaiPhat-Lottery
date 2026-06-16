import { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Typography, Chip } from '@mui/material';
import { ROUTES } from '../../../constants/routes';

export const STATUS_LABEL_MAP: Record<string, string> = {
    'PENDING_PAYMENT': 'Chờ thanh toán',
    'PAID': 'Đã thanh toán',
    'PREPARING': 'Đang chuẩn bị',
    'PENDING_PICKUP': 'Chờ nhận vé',
    'COMPLETED': 'Hoàn thành',
    'CANCELLED': 'Đã huỷ'
};

export const useOrderColumns = (): GridColDef[] => {
    const { t } = useTranslation();

    const getStatusColor = (status: string) => {
        const ORDER_STATUS_COLOR: Record<string, string> = {
            'PENDING_PAYMENT': 'warning',
            'PAID': 'success',
            'PREPARING': 'info',
            'PENDING_PICKUP': 'primary',
            'COMPLETED': 'success',
            'CANCELLED': 'error'
        };
        return ORDER_STATUS_COLOR[status] || 'default';
    };

    const getStatusLabel = (status: string) => {
        return STATUS_LABEL_MAP[status] || status;
    };

    return [
        {
            field: 'orderCode',
            headerName: 'Mã đơn',
            minWidth: 150,
            flex: 1,
            renderCell: (params) => (
                <Link
                    to={`/admin/order/detail/${params.row.id}`}
                    className="text-[var(--palette-primary-main)] hover:underline font-medium"
                >
                    {params.value}
                </Link>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Ngày tạo',
            minWidth: 160,
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2">
                    {params.value ? dayjs(params.value).format('DD/MM/YYYY HH:mm') : '-'}
                </Typography>
            ),
        },
        {
            field: 'name',
            headerName: 'Khách hàng',
            minWidth: 150,
            flex: 1,
            renderCell: (params) => (
                <div className="flex flex-col">
                    <Typography variant="body2" className="font-medium">{params.value || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">{params.row.phone || '-'}</Typography>
                </div>
            ),
        },
        {
            field: 'orderType',
            headerName: 'Loại đơn',
            minWidth: 120,
            flex: 0.8,
            renderCell: (params) => (
                <Chip
                    label={params.value === 'ONLINE' ? 'Online' : 'Tại quầy'}
                    size="small"
                    variant="outlined"
                    color={params.value === 'ONLINE' ? 'primary' : 'default'}
                />
            ),
        },
        {
            field: 'receiveType',
            headerName: 'Hình thức nhận',
            minWidth: 140,
            flex: 0.8,
            renderCell: (params) => (
                <Typography variant="body2">
                    {params.value === 'COUNTER_PICKUP' ? 'Nhận tại quầy' : params.value}
                </Typography>
            ),
        },
        {
            field: 'totalAmount',
            headerName: 'Tổng tiền',
            minWidth: 120,
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2" className="font-medium">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(params.value || 0)}
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            minWidth: 140,
            flex: 1,
            renderCell: (params) => (
                <Chip
                    label={getStatusLabel(params.value)}
                    color={getStatusColor(params.value) as any}
                    size="small"
                    className="font-medium"
                />
            ),
        },
    ];
};
