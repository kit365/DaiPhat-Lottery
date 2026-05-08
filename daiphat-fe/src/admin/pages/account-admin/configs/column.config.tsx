import { GridColDef, GridRenderCellParams, GridActionsCell, GridActionsCellItem } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { ListItemText } from '@mui/material';
import { COLORS } from './constants';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { UserStatus } from '../../../../types/user.type';

export const getColumnsConfig = (
    onEdit: (id: string) => void,
    onDelete: (id: string) => void,
    onView: (id: string) => void,
    page: number,
    pageSize: number
): GridColDef[] => [
        {
            field: 'fullName',
            headerName: 'Nhân viên',
            minWidth: 280,
            flex: 1.5,
            renderCell: (params: GridRenderCellParams) => (
                <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1 }}>
                    <Avatar
                        alt={params.row.fullName}
                        src={params.row.avatarUrl}
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            fontWeight: 700, 
                            bgcolor: 'rgba(145, 158, 171, 0.12)', 
                            color: 'var(--palette-primary-main)',
                            fontSize: '1rem'
                        }}
                    >
                        {params.row.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack spacing={0.25}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--palette-text-primary)' }}>
                            {params.row.fullName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>
                            {params.row.rolesName?.[0] || 'Member'}
                        </Typography>
                    </Stack>
                </Stack>
            ),
        },
        {
            field: 'contact',
            headerName: 'Liên hệ',
            minWidth: 240,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <Stack spacing={0.5} sx={{ py: 1, justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)', fontSize: '0.875rem' }}>
                        {params.row.phone || 'Chưa cập nhật'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                        {params.row.email}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 140,
            headerAlign: 'center',
            align: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const status = params.value as string;
                let color: 'success' | 'warning' | 'error' | 'default' = 'default';
                let label = status;

                if (status === UserStatus.ACTIVE) {
                    color = 'success';
                    label = 'Hoạt động';
                } else if (status === UserStatus.PENDING) {
                    color = 'warning';
                    label = 'Chờ xử lý';
                } else if (status === UserStatus.BANNED) {
                    color = 'error';
                    label = 'Bị cấm';
                } else if (status === UserStatus.LOCKED) {
                    color = 'default';
                    label = 'Bị khóa';
                }

                return (
                    <Chip
                        label={label}
                        size="small"
                        color={color}
                        variant="soft"
                        sx={{ 
                            fontWeight: 700, 
                            borderRadius: '6px',
                            height: 24,
                            fontSize: '0.75rem',
                            minWidth: 90
                        }}
                    />
                );
            },
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '',
            width: 60,
            align: 'right',
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon sx={{ fontSize: 20 }} />}
                    label="Chi tiết"
                    onClick={() => onView(params.id as string)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon sx={{ fontSize: 20 }} />}
                    label="Chỉnh sửa"
                    onClick={() => onEdit(params.id as string)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon sx={{ fontSize: 20, color: 'var(--palette-error-main)' }} />}
                    label="Xóa"
                    onClick={() => onDelete(params.id as string)}
                    showInMenu
                />,
            ],
        },
    ];

export const columnsInitialState = {
    pagination: {
        paginationModel: {
            pageSize: 10,
        },
    },
};
