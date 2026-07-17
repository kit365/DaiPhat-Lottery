import type { ReactElement } from 'react';
import { GridColDef, GridRenderCellParams, GridActionsCell, GridActionsCellItem } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
export const getColumnsConfig = (
    onEdit: (id: string) => void,
    onDelete: (id: string) => void,
    permissions: { canEdit?: boolean; canDelete?: boolean }
): GridColDef[] => [
        {
            field: 'stt',
            headerName: 'STT',
            width: 70,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const index = params.api.getAllRowIds().indexOf(params.id) + 1;
                return <Box sx={{ fontSize: '0.875rem' }}>{index}</Box>;
            },
        },
        {
            field: 'name',
            headerName: 'Tên nhóm quyền',
            flex: 1,
            minWidth: 220,
            renderCell: (params: GridRenderCellParams) => (
                <Stack spacing={0.5} sx={{ py: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                        {params.value}
                    </Typography>
                    {params.row.isStaff && (
                        <Box sx={{
                            display: 'inline-flex',
                            px: 1,
                            py: 0.2,
                            fontSize: '0.6875rem',
                            bgcolor: 'rgba(0, 167, 111, 0.16)',
                            color: 'rgb(0, 120, 103)',
                            borderRadius: "var(--shape-borderRadius-sm)",
                            fontWeight: 700,
                            width: 'fit-content'
                        }}>
                            Nhân viên kỹ thuật
                        </Box>
                    )}
                </Stack>
            ),
        },
        {
            field: 'departmentId',
            headerName: 'Phòng ban',
            flex: 1,
            minWidth: 150,
            renderCell: (params: GridRenderCellParams) => {
                const dept = params.value;
                if (!dept) return <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-disabled)' }}>-</Typography>;

                return (
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {typeof dept === 'string' ? dept : dept.name}
                    </Typography>
                );
            }
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 140,
            renderCell: (params: GridRenderCellParams) => {
                const isActive = params.value === 'active';
                return (
                    <Chip
                        label={isActive ? 'Hoạt động' : 'Tạm dừng'}
                        sx={{
                            bgcolor: isActive ? 'rgba(0, 167, 111, 0.16)' : 'rgba(255, 86, 48, 0.16)',
                            color: isActive ? 'rgb(0, 120, 103)' : 'rgb(183, 29, 71)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: '24px',
                            '& .MuiChip-label': { px: 1 }
                        }}
                    />
                );
            },
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params: GridRenderCellParams) => {
                const items: ReactElement[] = [];

                if (permissions.canEdit) {
                    items.push(
                        <GridActionsCellItem
                            key="edit"
                            icon={<EditIcon sx={{ fontSize: '1.25rem' }} />}
                            label="Chỉnh sửa"
                            onClick={() => onEdit(params.row._id)}
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
                    );
                }

                if (permissions.canDelete) {
                    items.push(
                        <GridActionsCellItem
                            key="delete"
                            icon={<DeleteIcon sx={{ fontSize: '1.25rem', color: 'var(--palette-error-main)' }} />}
                            label="Xóa"
                            onClick={() => onDelete(params.row._id)}
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
                    );
                }

                return <GridActionsCell {...params}>{items}</GridActionsCell>;
            },
        },
    ];

export const columnsInitialState = {
    pagination: {
        paginationModel: {
            pageSize: 10,
        },
    },
};




