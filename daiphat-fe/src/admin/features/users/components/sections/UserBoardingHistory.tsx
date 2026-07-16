import { Box, Typography, CircularProgress, Chip, Stack, TablePagination } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getBoardingTicketServiceOrders } from '../../../../api/boarding-booking.api';
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from '../../../../constants/routes';
import { useMemo, useState } from "react";

interface UserBoardingHistoryProps {
    userId: string;
}

export const UserBoardingHistory = ({ userId }: UserBoardingHistoryProps) => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const { data: res, isLoading } = useQuery({
        queryKey: ["user-boarding-ticketServiceOrders", userId, page, rowsPerPage],
        queryFn: () => getBoardingTicketServiceOrders({
            userId,
            page: page + 1,
            limit: rowsPerPage
        }),
        enabled: !!userId,
    });

    const ticketServiceOrders = useMemo(() => {
        if (!res) return [];
        const data = res as any;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [res]);

    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const statusMap: any = {
        pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
        held: { label: "Giữ chỗ", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
        confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
        'checked-in': { label: "Nhận chuồng", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
        'checked-out': { label: "Trả chuồng", color: "var(--palette-secondary-dark)", bg: "var(--palette-secondary-lighter)" },
        cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (ticketServiceOrders.length === 0) {
        return (
            <Box sx={{ p: 5, textAlign: 'center', color: 'var(--palette-text-disabled)' }}>
                Chưa có dữ liệu đặt chỗ khách sạn.
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 800 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 180px 150px 150px', p: 2, bgcolor: 'var(--palette-background-neutral)', fontWeight: 600 }}>
                        <Box>Mã đơn</Box>
                        <Box>Vé người dùng / Chuồng</Box>
                        <Box>Thời gian</Box>
                        <Box textAlign="right">Tổng tiền</Box>
                        <Box textAlign="center">Trạng thái</Box>
                    </Box>
                    {ticketServiceOrders.map((ticketServiceOrder: any) => (
                        <Box
                            key={ticketServiceOrder._id}
                            onClick={() => navigate(`/${prefixAdmin}/boarding/detail/${ticketServiceOrder._id}`)}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '220px 1fr 180px 150px 150px',
                                p: 2,
                                borderBottom: '1px dashed var(--palette-background-neutral)',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                #{ticketServiceOrder.code || ticketServiceOrder._id.slice(-6).toUpperCase()}
                            </Typography>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {ticketServiceOrder.userTicketIds?.map((p: any) => p.name).join(', ') || "N/A"}
                                    </Typography>
                                </Stack>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                    {ticketServiceOrder.cageId?.cageCode || "Chưa gán chuồng"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2">{dayjs(ticketServiceOrder.checkInDate).format("DD/MM/YYYY")} - {dayjs(ticketServiceOrder.checkOutDate).format("DD/MM/YYYY")}</Typography>
                            </Box>
                            <Typography variant="subtitle2" textAlign="right">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.total || 0)}
                            </Typography>
                            <Box textAlign="center">
                                {(() => {
                                    const status = statusMap[ticketServiceOrder.boardingStatus] || { label: ticketServiceOrder.boardingStatus, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
                                    return (
                                        <Chip
                                            label={status.label}
                                            size="small"
                                            sx={{
                                                borderRadius: "var(--shape-borderRadius-sm)",
                                                fontWeight: 700,
                                                fontSize: '0.6875rem',
                                                color: status.color,
                                                bgcolor: status.bg,
                                                height: '24px',
                                            }}
                                        />
                                    );
                                })()}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={pagination.totalRecords || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Số lượng hiển thị:"
                sx={{
                    '& .MuiTablePagination-selectLabel': { mb: 0 },
                    '& .MuiTablePagination-input': { mt: 0, mb: 0 },
                    '& .MuiTablePagination-actions': { mt: 0, mb: 0 },
                    '& .MuiTablePagination-toolbar': { minHeight: 48, p: 0, pr: 1 }
                }}
            />
        </Box>
    );
};
