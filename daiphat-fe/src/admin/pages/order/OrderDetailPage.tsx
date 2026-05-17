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
    alpha
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useOrderDetail, useUpdateOrderStatus, useUpdateOrder } from "./hooks/useOrderManagement";
import { toast } from "react-toastify";
import { exportInvoicePdf } from "../../api/order.api";

const STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
    shipping: { label: "Đang giao", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    shipped: { label: "Đã giao (Chờ nhận)", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    returned: { label: "Trả hàng", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    request_cancel: { label: "Yêu cầu hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const PAYMENT_STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    unpaid: { label: "Chưa thanh toán", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    paid: { label: "Đã thanh toán", color: "var(--palette-success-main)", bg: "rgba(34, 197, 94, 0.16)" },
    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
};

export const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: orderRes, isLoading } = useOrderDetail(id || "");
    const order = orderRes?.data;
    const { mutate: updateStatus } = useUpdateOrderStatus();
    const { mutate: updateOrder } = useUpdateOrder();
    const [isExporting, setIsExporting] = useState(false);

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

    const currentStatus = STATUS_OPTIONS[order.orderStatus] || STATUS_OPTIONS.pending;

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === "completed" && order.paymentStatus !== "paid") {
            toast.error("Đơn hàng chưa thanh toán, không thể chuyển sang Hoàn thành!");
            return;
        }

        updateStatus({ id: order._id, status: newStatus }, {
            onSuccess: () => toast.success("Cập nhật trạng thái thành công"),
            onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Cập nhật trạng thái thất bại")
        });
    };

    const handlePaymentStatusChange = (newStatus: string) => {
        if (order.paymentStatus === "paid" && newStatus === "unpaid") {
            toast.error("Không thể chuyển đơn đã thanh toán về chưa thanh toán!");
            return;
        }

        if (["cancelled", "request_cancel"].includes(order.orderStatus) && newStatus === "paid") {
            toast.error("Đơn hàng đã hủy hoặc yêu cầu hủy không thể chuyển sang Đã thanh toán!");
            return;
        }

        updateOrder({ id: order._id, data: { paymentStatus: newStatus } }, {
            onSuccess: () => toast.success("Cập nhật trạng thái thanh toán thành công"),
            onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Cập nhật trạng thái thanh toán thất bại")
        });
    };

    const handleExport = async () => {
        if (!order) return;
        setIsExporting(true);
        try {
            const blob = await exportInvoicePdf(order.code, order.phone);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${order.code}.pdf`);
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) link.parentNode.removeChild(link);
            toast.success("Đã tải xuống hóa đơn!");
        } catch (error) {
            console.error("Failed to export invoice:", error);
            toast.error("Xuất hóa đơn thất bại!");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
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
                                Đơn hàng #{order.code || order._id.slice(-6).toUpperCase()}
                            </Typography>
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
                        </Box>
                        <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)', fontSize: '0.875rem' }}>
                            {dayjs(order.createdAt).format("DD MMM YYYY h:mm a")}
                        </Typography>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Select
                        size="small"
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={order.orderStatus === 'completed' || order.orderStatus === 'cancelled' || order.orderStatus === 'returned'}
                        sx={{
                            minWidth: 140,
                            height: 36,
                            borderRadius: '8px',
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                                transition: (theme) => theme.transitions.create('border-color')
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--palette-text-primary)'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--palette-text-primary)',
                                borderWidth: '2px'
                            },
                            '& .MuiSelect-select': {
                                pr: '28px !important',
                                pl: '12px !important',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--palette-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                height: '100%',
                                py: 0
                            },
                            '& .MuiSelect-icon': {
                                width: 18,
                                height: 18,
                                color: 'var(--palette-text-primary)',
                                top: 'calc(50% - 9px)',
                                right: 6,
                                transition: (theme) => theme.transitions.create('transform'),
                            },
                            '&.Mui-disabled': {
                                opacity: 0.8,
                                '& .MuiSelect-icon': { display: 'none' }
                            }
                        }}
                        IconComponent={(props) => (
                            <Icon icon="eva:chevron-down-fill" {...props} width={20} />
                        )}
                        MenuProps={{
                            PaperProps: {
                                className: 'background-popup',
                                sx: {
                                    px: 0,
                                    width: 140,
                                    boxShadow: 'var(--customShadows-z20)',
                                    borderRadius: '8px',
                                    mt: 0.5,
                                    p: 0.5
                                }
                            }
                        }}
                    >
                        {Object.entries(STATUS_OPTIONS).map(([value, opt]) => (
                            <MenuItem
                                key={value}
                                value={value}
                                sx={{
                                    fontSize: '0.875rem',
                                    borderRadius: '6px',
                                    px: 1,
                                    py: 0.5,
                                    my: 0.25,
                                    '&.Mui-selected': {
                                        fontWeight: '600 !important',
                                        bgcolor: 'var(--palette-action-selected) !important',
                                        '&:hover': {
                                            bgcolor: 'var(--palette-action-selected) !important',
                                        }
                                    }
                                }}
                            >
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                    <Button
                        variant="outlined"
                        onClick={handleExport}
                        disabled={isExporting}
                        startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Icon icon="eva:printer-fill" />}
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
                        {isExporting ? "Đang xuất..." : "Export"}
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Left Column */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Details Card */}
                        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 3, px: 3, pb: 0 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Chi tiết</Typography>
                            </Stack>

                            <Box>
                                {order.items?.map((item: any, idx: number) => (
                                    <Stack
                                        key={idx}
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                        sx={{
                                            px: 3,
                                            py: 3,
                                            borderBottom: 'dashed 2px var(--palette-background-neutral)',
                                        }}
                                    >
                                        <Avatar
                                            src={item.image}
                                            variant="rounded"
                                            sx={{ width: 56, height: 56, bgcolor: 'background.neutral' }}
                                        >
                                            <Icon icon="solar:box-bold" width={28} />
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>{item.name}</Typography>
                                            <Typography sx={{ color: 'var(--palette-text-disabled)', fontSize: '0.875rem', mt: 0.5 }}>
                                                {item.variant?.join(', ') || "Mặc định"}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)', minWidth: 40, textAlign: 'center' }}>
                                            x{item.quantity || 1}
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 100, textAlign: 'right', color: 'var(--palette-text-primary)' }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0)}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Box sx={{ width: '100%', ml: 'auto', maxWidth: 240 }}>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Tạm tính</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.subTotal || 0)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Phí vận chuyển</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                {order.shipping?.fee ? `-${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.shipping.fee)}` : "Miễn phí"}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Giảm giá</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.discount || 0)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>Tổng tiền</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total || 0)}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Box>
                            </Box>
                        </Card>

                        {/* History Card - Modern Timeline */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 3, color: 'var(--palette-text-primary)' }}>Lịch sử đơn hàng</Typography>

                            <Stack spacing={0}>
                                {[
                                    { label: "Tạo đơn hàng", date: order.createdAt, active: true, icon: "solar:cart-large-minimalistic-bold", color: "#1877F2" },
                                    { label: "Xác nhận", date: order.confirmedAt, active: !!order.confirmedAt, icon: "solar:check-read-bold", color: "#1877F2" },
                                    { label: "Đang giao hàng", date: order.shippingAt, active: !!order.shippingAt, icon: "solar:delivery-bold", color: "#1877F2" },
                                    { label: "Đã giao đến nơi", date: order.shippedAt, active: !!order.shippedAt, icon: "solar:map-point-wave-bold", color: "#1877F2" },
                                    { label: "Hoàn thành", date: order.completedAt, active: !!order.completedAt, color: "#22C55E", icon: "solar:verified-check-bold" },
                                    order.cancelledAt && { label: "Đã hủy", date: order.cancelledAt, active: true, color: "#FF5630", icon: "solar:close-circle-bold" },
                                    order.returnedAt && { label: "Trả hàng", date: order.returnedAt, active: true, color: "#FFAB00", icon: "solar:back-bold" }
                                ].filter(Boolean).map((step: any, index: number, array: any[]) => (
                                    <Stack key={index} direction="row" spacing={2}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: step.active ? step.color : 'var(--palette-grey-400)',
                                                    zIndex: 1,
                                                    mt: 0.75,
                                                    boxShadow: step.active ? `0 0 0 4px ${alpha(step.color || '#F4F6F8', 0.12)}` : 'none'
                                                }}
                                            />
                                            {index !== array.length - 1 && (
                                                <Box sx={{
                                                    width: 2,
                                                    flexGrow: 1,
                                                    bgcolor: step.active && array[index + 1]?.active ? 'primary.main' : 'var(--palette-background-neutral)',
                                                    my: 0.5
                                                }} />
                                            )}
                                        </Box>

                                        <Box sx={{ pb: index === array.length - 1 ? 0 : 3, flexGrow: 1 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: step.active ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        {step.label}
                                                    </Typography>
                                                    {step.date && (
                                                        <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mt: 0.25 }}>
                                                            {dayjs(step.date).format("DD/MM/YYYY - hh:mm A")}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                {step.active && (
                                                    <Icon
                                                        icon={step.icon}
                                                        width={20}
                                                        color={step.active ? (step.color === 'error.main' ? '#FF5630' : '#1877F2') : '#919EAB'}
                                                        style={{ opacity: step.active ? 1 : 0.3 }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Column */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        {/* Payment Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Thanh toán</Typography>
                                <Select
                                    size="small"
                                    value={order.paymentStatus || 'unpaid'}
                                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                    disabled={order.paymentStatus === "refunded"}
                                    sx={{
                                        minWidth: 140,
                                        height: 32,
                                        borderRadius: '8px',
                                        '&.Mui-disabled': {
                                            opacity: 0.8,
                                            '-webkit-text-fill-color': 'inherit'
                                        },
                                        '& .MuiSelect-select': {
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            py: 0.5,
                                            px: 1,
                                            color: (PAYMENT_STATUS_OPTIONS[order.paymentStatus] || PAYMENT_STATUS_OPTIONS.unpaid).color,
                                            bgcolor: (PAYMENT_STATUS_OPTIONS[order.paymentStatus] || PAYMENT_STATUS_OPTIONS.unpaid).bg,
                                        }
                                    }}
                                >
                                    {Object.entries(PAYMENT_STATUS_OPTIONS).map(([value, opt]) => {
                                        if (order.paymentMethod === 'money' && value === 'refunded') return null;

                                        // Hide Paid if cancelled or request_cancel
                                        if (['cancelled', 'request_cancel'].includes(order.orderStatus) && value === 'paid') return null;

                                        // Hide Refunded if not cancelled or request_cancel
                                        if (value === 'refunded' && !['cancelled', 'request_cancel'].includes(order.orderStatus)) return null;

                                        return (
                                            <MenuItem
                                                key={value}
                                                value={value}
                                                sx={{ fontSize: '0.875rem' }}
                                                disabled={order.paymentStatus === 'paid' && value === 'unpaid'}
                                            >
                                                {opt.label}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Phương thức</Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {order.paymentMethod === 'money' ? 'Tiền mặt' :
                                            order.paymentMethod === 'vnpay' ? 'VNPay' :
                                                order.paymentMethod === 'zalopay' ? 'ZaloPay' : 'Chưa giao dịch'}
                                    </Typography>
                                    <Icon
                                        icon={
                                            order.paymentMethod === 'money' ? 'solar:hand-money-bold' :
                                                order.paymentMethod === 'vnpay' ? 'logos:vnpay' :
                                                    'logos:zalopay'
                                        }
                                        width={order.paymentMethod === 'money' ? 20 : 28}
                                        style={{ filter: order.paymentMethod === 'money' ? 'grayscale(1)' : 'none', opacity: order.paymentMethod === 'money' ? 0.7 : 1 }}
                                    />
                                </Stack>
                            </Stack>
                        </Card>

                        {/* Customer Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Khách hàng</Typography>
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <Avatar
                                    src={order.userId?.avatar}
                                    sx={{ width: 56, height: 56 }}
                                >
                                    <Icon icon="eva:person-fill" width={28} />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {order.userId ? `${order.userId.lastName} ${order.userId.firstName}` : (order.fullName || "Khách vãng lai")}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)', wordBreak: 'break-all' }}>
                                        {order.userId?.email || "Chưa có email"}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Card>

                        {/* Delivery Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Vận chuyển</Typography>
                            </Stack>
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Đơn vị</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>{order.shipping?.carrierName || "DHL"}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Phương thức</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>Tiêu chuẩn</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Mã vận đơn</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'underline' }}>
                                        {order.shipping?.goshipOrderId || "SPX037739199373"}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Card>

                        {/* Shipping Address Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Địa chỉ nhận hàng</Typography>
                            </Stack>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Địa chỉ</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {order.address || "Chưa có địa chỉ"}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Số điện thoại</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {order.phone || order.userId?.phone || "Chưa có số ĐT"}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
