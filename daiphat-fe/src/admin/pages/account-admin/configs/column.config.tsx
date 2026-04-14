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

export const getColumnsConfig = (
    onEdit: (id: string) => void,
    onDelete: (id: string) => void,
    onView: (id: string) => void
): GridColDef[] => [
        {
            field: 'fullName',
            headerName: 'Họ tên',
            flex: 1,
            minWidth: 280,
            renderCell: (params: GridRenderCellParams) => (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))", height: '100%' }}>
                    <Avatar
                        src={params.row.avatar}
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'rgba(145, 158, 171, 0.08)',
                            color: COLORS.primary,
                            fontWeight: 600
                        }}
                    >
                        {params.value?.charAt(0)}
                    </Avatar>
                    <ListItemText
                        primary={
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: COLORS.primary }}>
                                {params.value}
                            </Typography>
                        }
                        secondary={params.row.email}
                        slotProps={{
                            primary: { component: 'span', variant: 'body1', noWrap: true },
                            secondary: {
                                component: 'span',
                                variant: 'body2',
                                sx: { color: 'var(--palette-text-disabled)', fontSize: "0.8125rem" }
                            }
                        }}
                        sx={{ m: 0 }}
                    />
                </Stack>
            ),
        },
        {
            field: 'phone',
            headerName: 'Số điện thoại',
            width: 200,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))" }}>
                    <Typography sx={{ fontSize: '0.8125rem', color: COLORS.primary }}>
                        {params.value || '-'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'rolesName',
            headerName: 'Vai trò',
            flex: 1,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))", height: '100%', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {params.row.rolesName?.length > 0 ? (
                        params.row.rolesName.map((roleName: string, index: number) => (
                            <Typography key={index} sx={{ fontSize: '0.8125rem', color: COLORS.primary }}>
                                {roleName}
                            </Typography>
                        ))
                    ) : (
                        <Typography sx={{ fontSize: '0.8125rem', color: COLORS.disabled }}>-</Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 130,
            renderCell: (params: GridRenderCellParams) => {
                const statusMap: any = {
                    active: { label: 'Hoạt động', bg: 'rgba(0, 167, 111, 0.16)', color: 'rgb(0, 120, 103)' },
                    inactive: { label: 'Tạm dừng', bg: 'rgba(255, 86, 48, 0.16)', color: 'rgb(183, 29, 71)' },
                };
                const status = statusMap[params.value] || statusMap.inactive;
                return (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: "center", py: "calc(2 * var(--spacing))" }}>
                        <Chip
                            label={status.label}
                            sx={{
                                bgcolor: status.bg,
                                color: status.color,
                                fontWeight: 700,
                                fontSize: '0.6875rem',
                                height: '24px',
                                borderRadius: "var(--shape-borderRadius-sm)",
                                '& .MuiChip-label': { px: '6px' }
                            }}
                        />
                    </Box>
                );
            },
        },
        {
            field: 'actions',
            headerName: '',
            width: 64,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))" }}>
                    <GridActionsCell {...params}>
                        <GridActionsCellItem
                            icon={<VisibilityIcon sx={{ fontSize: '1.25rem' }} />}
                            label="Chi tiết"
                            onClick={() => onView(params.row.id || params.row._id)}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: "600"
                                    },
                                },
                            } as any)}
                        />
                        <GridActionsCellItem
                            icon={<EditIcon sx={{ fontSize: '1.25rem' }} />}
                            label="Chỉnh sửa"
                            onClick={() => onEdit(params.row.id || params.row._id)}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: "600"
                                    },
                                },
                            } as any)}
                        />
                        <GridActionsCellItem
                            icon={<DeleteIcon sx={{ fontSize: '1.25rem', color: 'var(--palette-error-main)' }} />}
                            label="Xóa"
                            onClick={() => onDelete(params.row.id || params.row._id)}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: "600",
                                        color: "var(--palette-error-main)"
                                    },
                                },
                            } as any)}
                        />
                    </GridActionsCell>
                </Box>
            ),
        },
    ];

export const columnsInitialState = {
    pagination: {
        paginationModel: {
            pageSize: 10,
        },
    },
};
