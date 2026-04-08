import { Box, Typography, CircularProgress, Chip, TablePagination } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../../../api/order.api";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { useMemo, useState } from "react";

interface UserOrderHistoryProps {
    userId: string;
}

export const UserOrderHistory = ({ userId }: UserOrderHistoryProps) => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const { data: res, isLoading } = useQuery({
        queryKey: ["user-orders", userId, page, rowsPerPage],
        queryFn: () => getOrders({
            userId,
            page: page + 1,
            limit: rowsPerPage
        }),
        enabled: !!userId,
    });

    const orders = useMemo(() => {
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
        confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
        shipping: { label: "Đang giao", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
        completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
        cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
        returned: { label: "Trả hàng", color: "var(--palette-secondary-dark)", bg: "var(--palette-secondary-lighter)" },
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (orders.length === 0) {
        return (
            <Box sx={{ p: 5, textAlign: 'center', color: 'var(--palette-text-disabled)' }}>
                Chưa có dữ liệu đơn hàng.
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 800 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 150px 150px 150px', p: 2, bgcolor: 'var(--palette-background-neutral)', fontWeight: 600 }}>
                        <Box>Mã đơn</Box>
                        <Box>Sản phẩm</Box>
                        <Box>Ngày đặt</Box>
                        <Box textAlign="right">Tổng cộng</Box>
                        <Box textAlign="center">Trạng thái</Box>
                    </Box>
                    {orders.map((order: any) => (
                        <Box
                            key={order._id}
                            onClick={() => navigate(`/${prefixAdmin}/order/detail/${order._id}`)}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '220px 1fr 150px 150px 150px',
                                p: 2,
                                borderBottom: '1px dashed var(--palette-background-neutral)',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                #{order.code || order._id.slice(-6).toUpperCase()}
                            </Typography>
                            <Box>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                    {order.tickets?.map((p: any) => p.ticketName || p.ticketId?.name).join(', ') || "N/A"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2">{dayjs(order.createdAt).format("DD/MM/YYYY")}</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                    {dayjs(order.createdAt).format("HH:mm")}
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" textAlign="right">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice || 0)}
                            </Typography>
                            <Box textAlign="center">
                                {(() => {
                                    const status = statusMap[order.status] || { label: order.status, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
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
