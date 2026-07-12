import { GridColDef } from '@mui/x-data-grid';
import { Chip, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';

export const columnsConfig = (onViewDetails: (id: number) => void): GridColDef[] => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'stationName', headerName: 'Đài Quay', flex: 1, minWidth: 150 },
    { field: 'region', headerName: 'Khu Vực', width: 120 },
    { 
        field: 'drawDate', 
        headerName: 'Ngày Quay', 
        width: 130,
        renderCell: (params) => dayjs(params.value).format('DD/MM/YYYY')
    },
    { 
        field: 'status', 
        headerName: 'Trạng Thái', 
        width: 150,
        renderCell: (params) => {
            const statusMap: Record<string, { label: string, color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
                'pending': { label: 'Chờ lấy', color: 'default' },
                'drawing': { label: 'Đang cập nhật', color: 'info' },
                'waiting_for_audit': { label: 'Chờ duyệt', color: 'warning' },
                'completed': { label: 'Hoàn tất', color: 'success' },
                'failed': { label: 'Thất bại', color: 'error' }
            };
            const s = statusMap[String(params.value || '').toLowerCase()] || { label: params.value, color: 'default' };
            return <Chip label={s.label} color={s.color} size="small" />;
        }
    },
    { 
        field: 'isOfficial', 
        headerName: 'Chính Thức', 
        width: 120,
        renderCell: (params) => (
            <Chip 
                label={params.value ? "Chính thức" : "Chưa chuẩn"} 
                color={params.value ? "primary" : "default"} 
                size="small" 
                variant={params.value ? "filled" : "outlined"}
            />
        )
    },
    { field: 'source', headerName: 'Nguồn', width: 120 },
    {
        field: 'detailCount',
        headerName: 'Số giải đã có',
        width: 130,
    },
    {
        field: 'actions',
        headerName: 'Thao Tác',
        width: 100,
        sortable: false,
        renderCell: (params) => (
            <Tooltip title="Xem chi tiết vé dò">
                <IconButton size="small" onClick={() => onViewDetails(params.row.id)}>
                    <VisibilityIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        ),
    },
];

export const columnsInitialState = {
    pagination: { paginationModel: { pageSize: 10 } },
};
