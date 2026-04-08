import { GridColDef, GridRenderCellParams, GridActionsCell, GridActionsCellItem } from "@mui/x-data-grid";
import { Typography, Stack, Avatar, Chip, Box } from "@mui/material";
import { Icon } from "@iconify/react";
import dayjs from "dayjs";

export const getTicketServiceOrderColumns = (
    onStatusUpdate: (id: string, status: string) => void,
    onViewDetail: (id: string) => void,
    onEdit: (ticketServiceOrder: any) => void,
    t: any
): GridColDef[] => [
        {
            field: "code",
            headerName: "Mã đơn",
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', px: "calc(2 * var(--spacing))" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--palette-text-primary)' }}>
                        #{params.value?.slice(-6).toUpperCase() || 'N/A'}
                    </Typography>
                </Box>
            )
        },
        {
            field: "userId",
            headerName: "Khách hàng",
            flex: 1.2,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams) => (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ py: "calc(2 * var(--spacing))", px: "12px", height: '100%' }}>
                    <Avatar
                        src={params.value?.avatar}
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--shape-borderRadius-sm)',
                            bgcolor: 'var(--palette-background-neutral)',
                        }}
                    >
                        <Icon icon="eva:person-fill" width={20} style={{ color: 'var(--palette-text-secondary)' }} />
                    </Avatar>
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--palette-text-primary)' }}>
                            {params.value?.fullName || 'Khách vãng lai'}
                        </Typography>
                        <Typography noWrap sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                            {params.value?.email || "Không có Email"}
                        </Typography>
                    </Stack>
                </Stack>
            )
        },

        {
            field: "start",
            headerName: "Thời gian",
            width: 200,
            renderCell: (params: GridRenderCellParams) => {
                const { start, end, actualStart, completedAt, ticketServiceOrderStatus } = params.row;
                if (!start) return (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', px: "calc(2 * var(--spacing))" }}>
                        <Typography sx={{ fontSize: '0.8125rem' }}>N/A</Typography>
                    </Box>
                );

                const isCompleted = ticketServiceOrderStatus === 'completed';
                const isInProgress = ticketServiceOrderStatus === 'in-progress';

                return (
                    <Stack spacing={0.25} justifyContent="center" sx={{ height: '100%', px: "calc(2 * var(--spacing))" }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--palette-text-primary)' }}>
                            {dayjs(start).format("DD/MM/YYYY")}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, textDecoration: (actualStart || completedAt) ? 'line-through' : 'none', opacity: (actualStart || completedAt) ? 0.6 : 1 }}>
                                {dayjs(start).format("HH:mm")} - {dayjs(end).format("HH:mm")}
                            </Typography>
                        </Stack>
                        {isInProgress && actualStart && (
                            <Typography sx={{ color: 'var(--palette-primary-main)', fontSize: '0.7rem', fontWeight: 700 }}>
                                🟢 Bắt đầu: {dayjs(actualStart).format("HH:mm")}
                            </Typography>
                        )}
                        {isCompleted && actualStart && completedAt && (
                            <Typography sx={{ color: 'var(--palette-success-main)', fontSize: '0.7rem', fontWeight: 700 }}>
                                ✨ Thực tế: {dayjs(actualStart).format("HH:mm")} - {dayjs(completedAt).format("HH:mm")}
                            </Typography>
                        )}
                    </Stack>
                );
            }
        },
        {
            field: "ticketServiceOrderStatus",
            headerName: "Trạng thái đơn",
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const statusMap: any = {
                    pending: { label: t("admin.ticketServiceOrder.status.pending"), color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
                    confirmed: { label: t("admin.ticketServiceOrder.status.confirmed"), color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
                    delayed: { label: "Trễ hẹn", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
                    "in-progress": { label: t("admin.ticketServiceOrder.status.in_progress"), color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
                    completed: { label: t("admin.ticketServiceOrder.status.completed"), color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
                    cancelled: { label: t("admin.ticketServiceOrder.status.cancelled"), color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" }
                };
                const status = statusMap[params.value] || { label: params.value, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
                return (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Chip
                            label={status.label}
                            sx={{
                                borderRadius: "var(--shape-borderRadius-sm)",
                                fontWeight: 700,
                                fontSize: '0.6875rem',
                                color: status.color,
                                bgcolor: status.bg,
                                height: '24px',
                                '& .MuiChip-label': { px: '8px' }
                            }}
                        />
                    </Box>
                );
            }
        },
        {
            field: "paymentStatus",
            headerName: "Thanh toán",
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const statusMap: any = {
                    unpaid: { label: "Chưa trả tiền", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
                    paid: { label: "Đã thanh toán", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
                    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" }
                };
                const status = statusMap[params.value] || { label: params.value, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
                return (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Chip
                            label={status.label}
                            sx={{
                                borderRadius: "var(--shape-borderRadius-sm)",
                                fontWeight: 700,
                                fontSize: '0.6875rem',
                                color: status.color,
                                bgcolor: status.bg,
                                height: '24px',
                                '& .MuiChip-label': { px: '8px' }
                            }}
                        />
                    </Box>
                );
            }
        },

        {
            field: "actions",
            headerName: "",
            width: 64,
            sortable: false,
            headerAlign: 'center',
            align: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', px: "calc(2 * var(--spacing))" }}>
                    <GridActionsCell {...params}>
                        <GridActionsCellItem
                            icon={<Icon icon="solar:pen-bold" width={20} />}
                            label="Chỉnh sửa"
                            onClick={() => onEdit(params.row)}
                            showInMenu
                        />
                        {params.row.ticketServiceOrderStatus === 'pending' && (
                            <GridActionsCellItem
                                icon={<Icon icon="eva:checkmark-circle-2-fill" width={20} />}
                                label="Xác nhận đơn"
                                onClick={() => onStatusUpdate(params.row._id, 'confirmed')}
                                showInMenu
                                {...({ sx: { color: 'var(--palette-success-main)', '& .MuiTypography-root': { color: 'var(--palette-success-main)' } } } as any)}
                            />
                        )}
                        {['pending', 'confirmed'].includes(params.row.ticketServiceOrderStatus) && (
                            <GridActionsCellItem
                                icon={<Icon icon="eva:close-circle-fill" width={20} />}
                                label="Hủy đơn"
                                onClick={() => onStatusUpdate(params.row._id, 'cancelled')}
                                showInMenu
                                {...({ sx: { color: 'var(--palette-error-main)', '& .MuiTypography-root': { color: 'var(--palette-error-main)' } } } as any)}
                            />
                        )}
                        <GridActionsCellItem
                            icon={<Icon icon="eva:eye-fill" width={20} />}
                            label="Xem chi tiết"
                            onClick={() => onViewDetail(params.row._id)}
                            showInMenu
                        />
                    </GridActionsCell>
                </Box>
            )
        }
    ];

export const TicketServiceOrderColumnsInitialState = {
    pagination: {
        paginationModel: {
            pageSize: 10,
        },
    },
};




