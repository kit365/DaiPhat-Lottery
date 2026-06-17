import { useState } from "react";
import {
    Box,
    Card,
    Stack,
    Grid,
    Avatar,
    Typography,
    Button,
    Chip,
    IconButton,
    MenuItem,
    Select,
    CircularProgress,
    alpha,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useOrderDetail, useUpdateOrderStatus } from "./hooks/useOrderManagement";
import { OrderStatus } from "../../../types/order.type";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../constants/routes";
import { confirmAction, confirmInputText } from "../../utils/swal";

const STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    [OrderStatus.PENDING_PAYMENT]: { label: "Chờ thanh toán", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    [OrderStatus.PAID]: { label: "Đã thanh toán", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
    [OrderStatus.PREPARING]: { label: "Đang chuẩn bị", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    [OrderStatus.PENDING_PICKUP]: { label: "Chờ nhận vé", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    [OrderStatus.COMPLETED]: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    [OrderStatus.CANCELLED]: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" }
};

const PAYMENT_STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    unpaid: { label: "Chưa thanh toán", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    partially_paid: { label: "Thanh toán một phần", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    paid: { label: "Đã thanh toán", color: "var(--palette-success-main)", bg: "rgba(34, 197, 94, 0.16)" },
    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
};

export const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: orderRes, isLoading, refetch } = useOrderDetail(id || "");
    const order = orderRes?.data;
    const { mutate: updateStatus } = useUpdateOrderStatus();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!order) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--palette-text-primary)' }}>Không tìm thấy đơn hàng</Typography>
            </Box>
        );
    }

    const currentStatus = STATUS_OPTIONS[order.status] || STATUS_OPTIONS[OrderStatus.PENDING_PAYMENT];
    const isTerminalStatus = [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as OrderStatus);

    const handleStatusChange = (newStatus: string) => {
        const update = () => {
            updateStatus({ id: order.id, status: newStatus as OrderStatus }, {
                onSuccess: () => toast.success("Cập nhật trạng thái thành công")
            });
        };

        if (newStatus === OrderStatus.PREPARING) {
            confirmAction(
                "Bắt đầu chuẩn bị?",
                "Xác nhận bắt đầu chuẩn bị đơn hàng này.",
                update,
                'info'
            );
        } else if (newStatus === OrderStatus.COMPLETED) {
            confirmAction(
                "Hoàn thành đơn hàng?",
                "Bạn có chắc chắn muốn xác nhận hoàn thành đơn hàng này?",
                update,
                'success'
            );
        } else if (newStatus === OrderStatus.CANCELLED) {
            confirmInputText(
                "Xác nhận hủy đơn",
                "Nhập lý do hủy đơn",
                "Ví dụ: Khách yêu cầu huỷ",
                (reason) => {
                    updateStatus({ id: order.id, status: newStatus as OrderStatus, reason: reason || "Hủy bởi Admin" }, {
                        onSuccess: () => {
                            toast.success("Hủy đơn thành công");
                            refetch();
                        },
                        onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi khi hủy đơn")
                    });
                },
                'warning'
            );
        } else {
            update();
        }
    };

    const paymentStatus = order.status === OrderStatus.PENDING_PAYMENT ? 'unpaid' : 
                          order.status === OrderStatus.CANCELLED ? 'refunded' : 'paid';

    const handlePrint = () => {
        toast.info("Chức năng in đang được cập nhật");
    };

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            {/* Header section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <IconButton
                        onClick={() => navigate(-1)}
                        sx={{
                            color: 'var(--palette-action-active)',
                            p: 0.75,
                            mr: 1,
                            mt: 0.25
                        }}
                    >
                        <Icon icon="eva:arrow-ios-back-fill" width={20} />
                    </IconButton>

                    <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h4" sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                Đơn mua hộ #{order.orderCode || order.id?.slice(-6).toUpperCase() || 'ERROR'}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip
                                label={currentStatus.label}
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    height: 22,
                                    fontSize: '0.75rem',
                                    borderRadius: 'var(--shape-borderRadius-sm)',
                                    color: currentStatus.color,
                                    bgcolor: currentStatus.bg,
                                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.48))',
                                }}
                            />
                            <Chip
                                label="Tại quầy"
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    height: 22,
                                    fontSize: '0.75rem',
                                    borderRadius: 'var(--shape-borderRadius-sm)',
                                    color: "var(--palette-info-dark)",
                                    bgcolor: "var(--palette-info-lighter)",
                                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.48))',
                                }}
                            />
                        </Stack>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button 
                        variant="contained" 
                        color="success"
                        startIcon={<Icon icon="solar:refresh-circle-linear" />}
                        sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                    >
                        Chuyển sang "Chờ nhận vé"
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="eva:printer-fill" />}
                        onClick={handlePrint}
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            minWidth: 64,
                            height: 36,
                            lineHeight: 1.71429,
                            padding: '2px 12px',
                            textTransform: 'capitalize',
                            borderRadius: '8px',
                            borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                            color: 'var(--palette-text-primary)',
                            transition: (theme) => theme.transitions.create(['background-color', 'box-shadow', 'border-color'], {
                                duration: 250,
                            }),
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                borderColor: 'currentColor',
                                boxShadow: 'currentColor 0px 0px 0px 0.75px',
                            },
                        }}
                    >
                        In đơn
                    </Button>
                </Stack>
            </Box>

            {/* Stepper Card (Full Width) */}
            <Card sx={{ p: 4, mb: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    {/* Track Background */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 15, 
                        left: '12%', 
                        right: '12%', 
                        height: 2, 
                        bgcolor: '#E5E8EB',
                        zIndex: 0
                    }} />
                    
                    {/* Active Track */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 15, 
                        left: '12%', 
                        width: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? 
                               (['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? 
                               (['PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? '76%' : '50%') : '25%') : '0%', 
                        height: 2, 
                        bgcolor: 'var(--palette-success-main)',
                        zIndex: 0,
                        transition: 'width 0.3s ease'
                    }} />

                    {[
                        { label: 'Đã đặt đơn', date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'), completed: true },
                        { label: 'Đã thanh toán', date: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm') : '', completed: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) },
                        { label: 'Đang chuẩn bị', date: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm') : '', completed: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) },
                        { label: 'Chờ nhận vé', date: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm') : '', completed: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status) },
                    ].map((step, index) => (
                        <Box key={index} sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '25%' }}>
                            <Box sx={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%', 
                                bgcolor: 'white',
                                border: step.completed ? '2px solid var(--palette-success-main)' : '2px solid #DFE3E8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 1.5
                            }}>
                                {step.completed ? 
                                    <Icon icon="solar:check-read-linear" color="var(--palette-success-main)" width={20} /> :
                                    <Icon icon="solar:lock-password-linear" color="#919EAB" width={16} />
                                }
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)', mb: 0.5, fontSize: '0.8125rem' }}>{step.label}</Typography>
                            {step.date && <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>{step.date}</Typography>}
                        </Box>
                    ))}
                </Box>
            </Card>

            <Grid container spacing={3}>
                {/* Left Column */}
                <Grid size={{ xs: 12, md: 8, lg: 9 }}>
                    <Stack spacing={3}>
                        {/* Summary Info Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Mã đơn hàng</Typography>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                            {order.orderCode || order.id?.slice(-6).toUpperCase() || 'ERROR'}
                                        </Typography>
                                        <IconButton size="small" sx={{ p: 0.5, color: 'var(--palette-primary-main)' }} onClick={() => {
                                            navigator.clipboard.writeText(order.orderCode || order.id?.slice(-6).toUpperCase() || 'ERROR');
                                            toast.success("Đã copy mã đơn hàng");
                                        }}>
                                            <Icon icon="solar:copy-bold-duotone" width={16} />
                                        </IconButton>
                                    </Stack>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Ngày đặt</Typography>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Icon icon="solar:calendar-date-bold-duotone" width={18} style={{ color: 'var(--palette-text-secondary)' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                            {dayjs(order.createdAt).format("DD/MM/YYYY HH:mm")}
                                        </Typography>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Giờ lấy vé (dự kiến)</Typography>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Icon icon="solar:clock-circle-bold-duotone" width={18} style={{ color: 'var(--palette-text-secondary)' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                            {order.expectedPickupAt ? dayjs(order.expectedPickupAt).format("DD/MM/YYYY HH:mm") : "Chưa xác định"}
                                        </Typography>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Loại đơn</Typography>
                                    <Chip
                                        label="Tại quầy"
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: "var(--palette-info-dark)",
                                            bgcolor: "var(--palette-info-lighter)",
                                        }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Trạng thái</Typography>
                                    <Chip
                                        label={currentStatus.label}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: currentStatus.color,
                                            bgcolor: currentStatus.bg,
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

                            <Box>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Ghi chú</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                    {order.note || "Không có"}
                                </Typography>
                            </Box>
                        </Card>



                        {/* Danh sách vé Card */}
                        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 3, px: 3, pb: 3 }}>
                                        <Icon icon="solar:ticket-bold-duotone" width={24} style={{ color: 'var(--palette-success-main)' }} />
                                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>Danh sách vé</Typography>
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', ml: 1 }}>({order.orderDetails?.length || 0} vé)</Typography>
                                    </Stack>
                                    
                                    <TableContainer>
                                        <Table sx={{ minWidth: 600 }}>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                                    <TableCell align="center" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Vé số</TableCell>
                                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Đài</TableCell>
                                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Ngày xổ</TableCell>
                                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Loại vé</TableCell>
                                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Giá</TableCell>
                                                    <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                                    <TableCell align="center" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Thao tác</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(order.orderDetails || []).map((detail: any, idx: number) => (
                                                    <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell align="center">
                                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                                                <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: '#ee1314', color: 'white' }}>
                                                                    <Icon icon="solar:ticket-bold-duotone" width={20} />
                                                                </Avatar>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                                    {detail.lotteryTicket?.symbol || '283749'}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                                {detail.lotteryTicket?.province?.name || 'Đồng Nai'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                                {detail.lotteryTicket?.drawDate ? dayjs(detail.lotteryTicket.drawDate).format("DD/MM/YYYY") : '16/06/2026'}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                                ({detail.lotteryTicket?.drawDate ? dayjs(detail.lotteryTicket.drawDate).locale('vi').format("dddd") : 'Thứ Hai'})
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                                Vé thường
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                                {(detail.price || 10000).toLocaleString('vi-VN')}đ
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label="Đã mua" size="small" sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem', borderRadius: '6px', color: "var(--palette-success-dark)", bgcolor: "var(--palette-success-lighter)" }} />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Button variant="outlined" size="small" endIcon={<Icon icon="solar:square-top-down-linear" style={{ transform: 'rotate(-45deg)' }} />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, color: 'var(--palette-success-main)', borderColor: 'var(--palette-success-main)', '&:hover': { bgcolor: 'var(--palette-success-lighter)', borderColor: 'var(--palette-success-main)' } }}>
                                                                Xem kết quả
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                                            Tổng số vé: {order.orderDetails?.length || 2}
                                        </Typography>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>Tổng tiền:</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-success-main)' }}>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 20000)}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Card>

                    </Stack>
                </Grid>

                {/* Right Column */}
                <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <Stack spacing={3}>
                        {/* Customer Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                                <Icon icon="solar:user-bold" width={24} style={{ color: 'var(--palette-success-main)' }} />
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>Thông tin khách hàng</Typography>
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
                                <Avatar
                                    src={order.user?.avatar}
                                    sx={{ width: 64, height: 64, bgcolor: 'var(--palette-background-neutral)', color: 'var(--palette-text-secondary)' }}
                                >
                                    <Icon icon="solar:user-rounded-bold" width={32} />
                                </Avatar>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                            {order.name || order.user?.fullName || "Admin Super"}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                        {order.phone || order.user?.phone || "0764349959"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                        {order.user?.email || "admin@daiphat.com"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5, lineHeight: 1.5 }}>
                                        {order.address || "123 Đường ABC, P. Tân Bình, Q. Tân Bình, TP. HCM"}
                                    </Typography>
                                </Stack>
                            </Stack>
                            
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                startIcon={<Icon icon="solar:user-id-linear" />}
                                onClick={() => navigate(`/${prefixAdmin}/account-admin/detail/${order.user?.id}`)}
                                sx={{ 
                                    py: 1, 
                                    fontWeight: 700, 
                                    color: 'var(--palette-text-primary)',
                                    borderColor: 'var(--palette-divider)',
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        bgcolor: 'var(--palette-action-hover)',
                                        borderColor: 'var(--palette-text-primary)'
                                    }
                                }}
                            >
                                Xem chi tiết khách hàng
                            </Button>
                        </Card>



                        {/* Thanh toán Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                                <Icon icon="solar:wallet-money-bold-duotone" width={24} style={{ color: 'var(--palette-success-main)' }} />
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>Thanh toán</Typography>
                            </Stack>

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.5 }}>Tổng tiền</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--palette-success-main)' }}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 20000)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.5 }}>Phương thức</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                        {order.paymentMethod === 'BANK_TRANSFER' ? 'PayOS (Chuyển khoản QR)' : (order.paymentMethod || 'Tiền mặt')}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.5 }}>Thời gian thanh toán</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? dayjs(order.updatedAt).format("DD/MM/YYYY - HH:mm") : "Chưa thanh toán"}
                                    </Typography>
                                </Box>
                                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Trạng thái thanh toán</Typography>
                                    <Chip
                                        label={['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? "Đã thanh toán" : "Chưa thanh toán"}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? "var(--palette-success-dark)" : "var(--palette-warning-dark)",
                                            bgcolor: ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status) ? "var(--palette-success-lighter)" : "var(--palette-warning-lighter)",
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
