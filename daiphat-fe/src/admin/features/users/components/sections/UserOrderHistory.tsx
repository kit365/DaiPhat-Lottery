"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box, Typography, TablePagination } from "@mui/material";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import { useUserOrders } from "../../hooks/useUserOrders";
import dayjs from "dayjs";
import { prefixAdmin } from '../../../../constants/routes';
import { useState } from "react";
import { OrderStatusBadge } from '@/shared/components/StatusBadge';

interface UserOrderHistoryProps {
    userId: string;
}

export const UserOrderHistory = ({ userId }: UserOrderHistoryProps) => {
    const router = useAdminRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const { data, isLoading } = useUserOrders(userId, page, rowsPerPage);

    const orders = data?.orders ?? [];
    const pagination = data?.pagination || { totalRecords: 0 };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (isLoading) {
        return <SpinnerLoading compact />;
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
                    {orders.map((order: any) => {
                        const orderId = String(order.id || order._id || '');
                        const orderCode =
                            order.orderCode ||
                            order.code ||
                            (orderId ? `#${orderId.slice(-6).toUpperCase()}` : '—');
                        const productLabel =
                            order.tickets?.map((p: any) => p.ticketName || p.ticketId?.name).filter(Boolean).join(', ') ||
                            order.orderDetails?.map((p: any) => p.ticketName || p.productName || p.name).filter(Boolean).join(', ') ||
                            'N/A';

                        return (
                            <Box
                                key={orderId || orderCode}
                                onClick={() => {
                                    if (orderId) router.push(`/${prefixAdmin}/order/detail/${orderId}`);
                                }}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '220px 1fr 150px 150px 150px',
                                    p: 2,
                                    borderBottom: '1px dashed var(--palette-background-neutral)',
                                    cursor: orderId ? 'pointer' : 'default',
                                    '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                    {orderCode.startsWith('#') ? orderCode : `#${orderCode}`}
                                </Typography>
                                <Box>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                        {productLabel}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2">{dayjs(order.createdAt).format("DD/MM/YYYY")}</Typography>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                        {dayjs(order.createdAt).format("HH:mm")}
                                    </Typography>
                                </Box>
                                <Typography variant="subtitle2" textAlign="right">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount ?? order.totalPrice ?? 0)}
                                </Typography>
                                <Box textAlign="center">
                                    <OrderStatusBadge status={order.status} />
                                </Box>
                            </Box>
                        );
                    })}
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
