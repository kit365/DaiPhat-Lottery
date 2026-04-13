import { GridActionsCell, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import { Chip, Stack, Box, Avatar, ListItemText, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { useReviews } from './useReviews';

const COLORS = {
    primary: 'rgb(33, 43, 54)',
    secondary: 'rgb(99, 115, 129)',
    disabled: 'rgb(145, 158, 171)',
};

export const useReviewColumns = () => {
    const { changeStatus, deleteReview } = useReviews();

    const columns: GridColDef[] = [
        {
            field: 'userName',
            headerName: 'Người dùng',
            flex: 1.2,
            minWidth: 250,
            renderCell: (params) => (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))", height: '100%' }}>
                    <Avatar
                        src={params.row.userAvatar}
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--shape-borderRadius-md)',
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
                        secondary={params.row.userEmail}
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
            field: 'ticketName',
            headerName: 'Sản phẩm',
            flex: 1.2,
            minWidth: 250,
            renderCell: (params) => (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ py: "calc(2 * var(--spacing))", px: "calc(2 * var(--spacing))", height: '100%' }}>
                    <Avatar
                        src={params.row.ticketImage}
                        variant="rounded"
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--shape-borderRadius-md)',
                            bgcolor: 'rgba(145, 158, 171, 0.08)',
                        }}
                    />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: COLORS.primary }}>
                        {params.value}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: 'reviewInfo',
            headerName: 'Đánh giá',
            flex: 2,
            minWidth: 320,
            renderCell: (params) => (
                <Box sx={{ py: 1.5, px: 2, display: 'flex', flexDirection: 'column', gap: 0.5, justifyContent: 'center', height: '100%' }}>
                    <Box sx={{ fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 600, color: COLORS.secondary }}>Số sao: </span>
                        <span style={{ color: COLORS.primary, fontWeight: 600 }}>{params.row.rating}</span>
                    </Box>
                    <Box sx={{ fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 600, color: COLORS.secondary }}>Nội dung: </span>
                        <span style={{ color: COLORS.primary }}>{params.row.comment}</span>
                    </Box>
                    {params.row.images && params.row.images.length > 0 && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {params.row.images.map((img: string, idx: number) => (
                                <Box
                                    key={idx}
                                    component="img"
                                    src={img}
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 1,
                                        objectFit: 'cover',
                                        border: '1px solid var(--palette-background-neutral)'
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const statusMap: any = {
                    approved: { label: 'Đã duyệt', bg: 'rgba(0, 167, 111, 0.16)', color: 'rgb(0, 120, 103)' },
                    rejected: { label: 'Đã ẩn', bg: 'rgba(255, 171, 0, 0.16)', color: 'rgb(183, 110, 0)' },
                    pending: { label: 'Chưa duyệt', bg: 'rgba(33, 43, 54, 0.08)', color: 'rgb(33, 43, 54)' },
                };
                const status = statusMap[params.value] || statusMap.pending;
                return (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: "center" }}>
                        <Chip
                            label={status.label}
                            sx={{
                                bgcolor: status.bg,
                                color: status.color,
                                fontWeight: 700,
                                fontSize: '0.6875rem',
                                height: '24px',
                                borderRadius: "var(--shape-borderRadius-sm)",
                                '& .MuiChip-label': { px: '8px' }
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
            align: 'right',
            renderCell: (params) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', px: 2 }}>
                    <GridActionsCell {...params}>
                        <GridActionsCellItem
                            icon={<CheckCircleIcon sx={{ fontSize: '1.25rem', color: 'rgb(0, 167, 111)' }} />}
                            label="Duyệt"
                            onClick={() => changeStatus({ id: params.row.id, status: 'approved' })}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': { fontSize: '0.8125rem', fontWeight: 600 }
                                }
                            } as any)}
                        />
                        <GridActionsCellItem
                            icon={<VisibilityOffIcon sx={{ fontSize: '1.25rem', color: 'rgb(255, 171, 0)' }} />}
                            label="Ẩn"
                            onClick={() => changeStatus({ id: params.row.id, status: 'rejected' })}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': { fontSize: '0.8125rem', fontWeight: 600 }
                                }
                            } as any)}
                        />
                        <GridActionsCellItem
                            icon={<DeleteIcon sx={{ fontSize: '1.25rem', color: 'var(--palette-error-main)' }} />}
                            label="Xóa"
                            onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
                                    deleteReview(params.row.id);
                                }
                            }}
                            showInMenu
                            {...({
                                sx: {
                                    '& .MuiTypography-root': {
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        color: 'var(--palette-error-main)'
                                    }
                                }
                            } as any)}
                        />
                    </GridActionsCell>
                </Box>
            ),
        },
    ];

    return columns;
};
