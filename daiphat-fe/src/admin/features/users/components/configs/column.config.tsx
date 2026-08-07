import Box from '@mui/material/Box';
import { GridColDef, GridRenderCellParams, GridActionsCellItem } from '@mui/x-data-grid';
import Avatar from '@mui/material/Avatar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { UserStatus, STATUS_COLORS, STATUS_LABELS } from '../../../../../types/user.type';

export const getColumnsConfig = (
    onEdit: (id: string) => void,
    onDelete: (id: string) => void,
    onView: (id: string) => void,
    permissions: { canEdit?: boolean; canDelete?: boolean; canView?: boolean },
    _page: number,
    _pageSize: number,
    isClient?: boolean
): GridColDef[] => [
        {
            field: 'fullName',
            headerName: isClient ? 'Khách hàng' : 'Quản trị viên',
            minWidth: 280,
            flex: 1.5,
            renderCell: (params: GridRenderCellParams) => (
                <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
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
                        {params.row.lastName?.charAt(0).toUpperCase()}
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
                <Stack spacing={0.5} sx={{ py: 2, justifyContent: 'center', height: '100%' }}>
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
                const colorKey = STATUS_COLORS[status] || 'default';
                const label = STATUS_LABELS[status] || status;
                // Use span with same styling as blog status badge
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <span
                            className="minimal__label__root"
                            style={{
                                height: '24px',
                                minWidth: '24px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                color: `var(--palette-${colorKey}-dark)`,
                                backgroundColor: `rgba(var(--palette-${colorKey}-mainChannel) / calc(var(--opacity-soft-bg) * 100%))`,
                            }}
                        >
                            {label}
                        </span>
                    </Box>
                );
            },
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '',
            width: 80,
            align: 'right',
            getActions: (params) => {
                const actions: any[] = [];
                
                if (permissions.canEdit) {
                    actions.push(
                        <GridActionsCellItem
                            key="edit-inline"
                            icon={<EditIcon sx={{ fontSize: '20px !important' }} />}
                            label="Chỉnh sửa"
                            onClick={() => onEdit(params.id as string)}
                            {...({ sx: { width: 36, height: 36, '& .MuiSvgIcon-root': { fontSize: '20px !important' } } } as any)}
                        />
                    );
                }
                
                if (permissions.canView) {
                    actions.push(
                        <GridActionsCellItem
                            key="view"
                            icon={<VisibilityIcon sx={{ fontSize: 20 }} />}
                            label="Chi tiết"
                            onClick={() => onView(params.id as string)}
                            showInMenu
                        />
                    );
                }
                
                if (permissions.canEdit) {
                    actions.push(
                        <GridActionsCellItem
                            key="edit"
                            icon={<EditIcon sx={{ fontSize: 20 }} />}
                            label="Chỉnh sửa"
                            onClick={() => onEdit(params.id as string)}
                            showInMenu
                        />
                    );
                }
                
                if (permissions.canDelete) {
                    actions.push(
                        <GridActionsCellItem
                            key="delete"
                            icon={<DeleteIcon sx={{ fontSize: 20, color: 'var(--palette-error-main)' }} />}
                            label="Xóa"
                            onClick={() => onDelete(params.id as string)}
                            showInMenu
                        />
                    );
                }

                return actions;
            },
        },
    ];

export const columnsInitialState = {};
