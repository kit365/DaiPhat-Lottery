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
import { Title } from "../../../../components/ui/Title";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { useOrderDetail, useUpdateOrderStatus } from "../../hooks/useOrder";
import { OrderStatus, resolveLotteryTicketSerialStatusBadge, resolveOrderDetailStatusBadge } from "../../../../../types/order.type";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../../../constants/routes";
import { confirmAction } from "../../../../utils/swal";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { OrderInspectionSection } from "../sections/OrderInspectionSection";
import { OrderHandoverConfirmDialog } from "../sections/OrderHandoverConfirmDialog";
import { getOrderStatusBadge } from "../../constants/orderStatus.constants";
import { resolveOrderPaymentMethodLabel } from "../../../../../utils/orderPayment.util";

const PAYMENT_STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    unpaid: { label: "Chưa thanh toán", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    partially_paid: { label: "Thanh toán một phần", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    paid: { label: "Đã thanh toán", color: "var(--palette-success-main)", bg: "rgba(34, 197, 94, 0.16)" },
    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
};

export const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: orderRes, isLoading } = useOrderDetail(id || "");
    const order = orderRes?.data;
    const { mutate: updateStatus } = useUpdateOrderStatus();
    const [isInspectionStarted, setIsInspectionStarted] = useState(false);
    const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);

    const handleBaoLoiHuyDon = () => {
        if (!order) return;
        navigate(`/${prefixAdmin}/order/detail/${order.id}/cancel-with-refund`);
    };

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

    const currentStatus = getOrderStatusBadge(order.status);
    const isTerminalStatus = [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as OrderStatus);

    const handleStatusChange = (newStatus: string) => {
        const update = () => {
            updateStatus({ id: order.id, status: newStatus as OrderStatus }, {
                onSuccess: () => toast.success("Cập nhật trạng thái thành công"),
                onError: (error: any) => {
                    toast.error(
                        error?.response?.data?.message
                        || "Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại."
                    );
                },
            });
        };

        if (newStatus === OrderStatus.PREPARING) {
            confirmAction(
                "Bắt đầu chuẩn bị?",
                "Xác nhận bắt đầu chuẩn bị đơn hàng này.",
                update,
                'info'
            );
        } else if (newStatus === OrderStatus.PENDING_PICKUP) {
            confirmAction(
                "Chuyển sang Chờ nhận vé?",
                "Bạn có chắc chắn muốn chuyển trạng thái thành chờ nhận vé?",
                update,
                'info'
            );
        } else if (newStatus === OrderStatus.COMPLETED) {
            if (order.status === OrderStatus.PENDING_PICKUP) {
                setHandoverDialogOpen(true);
                return;
            }
            confirmAction(
                "Hoàn thành đơn hàng?",
                "Bạn có chắc chắn muốn xác nhận hoàn thành đơn hàng này?",
                update,
                'success'
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
            {/* Unified Header section */}
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box>
                        <Title title={`Đơn hàng #${order.orderCode || order.id?.slice(-6).toUpperCase() || 'ERROR'}`} />
                        <Breadcrumb
                            items={[
                                { label: 'Bảng điều khiển', to: `/${prefixAdmin}/dashboard` },
                                { label: 'Đơn hàng', to: `/${prefixAdmin}/order/list` },
                                { label: 'Chi tiết đơn hàng' }
                            ]}
                        />
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    {order.status === OrderStatus.PAID && (
                        <Button 
                            variant="contained" 
                            startIcon={<Icon icon="solar:box-minimalistic-bold-duotone" />}
                            onClick={() => handleStatusChange(OrderStatus.PREPARING)}
                            sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none', bgcolor: 'var(--palette-grey-800)', color: 'common.white', '&:hover': { bgcolor: 'var(--palette-grey-900)' } }}
                        >
                            Bắt đầu chuẩn bị
                        </Button>
                    )}

                    {order.status === OrderStatus.PENDING_PICKUP && (
                        <Button 
                            variant="contained" 
                            startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                            onClick={() => handleStatusChange(OrderStatus.COMPLETED)}
                            sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none', bgcolor: 'var(--palette-grey-800)', color: 'common.white', '&:hover': { bgcolor: 'var(--palette-grey-900)' } }}
                        >
                            Hoàn thành đơn hàng
                        </Button>
                    )}
                    {order.status === OrderStatus.PENDING_PAYMENT && order.orderType === 'DIRECT' && (
                        <Button 
                            variant="contained" 
                            startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                            onClick={() => handleStatusChange(OrderStatus.COMPLETED)}
                            sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none', bgcolor: 'var(--palette-grey-800)', color: 'common.white', '&:hover': { bgcolor: 'var(--palette-grey-900)' } }}
                        >
                            Đã thanh toán & Hoàn thành
                        </Button>
                    )}
                    <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                        {[OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP].includes(
                            order.status as OrderStatus
                        ) && (
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={<Icon icon="solar:danger-triangle-bold-duotone" />}
                                onClick={handleBaoLoiHuyDon}
                                sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                            >
                                Báo lỗi & Hủy đơn
                            </Button>
                        )}
                    </CanAccess>
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
                    <Button 
                        variant="outlined" 
                        onClick={() => navigate(-1)} 
                        startIcon={<Icon icon="eva:arrow-back-fill" />}
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            height: 36,
                            borderRadius: '8px',
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-divider)',
                            '&:hover': {
                                bgcolor: 'var(--palette-action-hover)',
                                borderColor: 'var(--palette-text-primary)'
                            }
                        }}
                    >
                        Quay lại
                    </Button>
                </Stack>
            </Box>

            {/* Stepper Card (Full Width) */}
            {order.orderType !== 'DIRECT' && (() => {
                const isCancelled = order.status === OrderStatus.CANCELLED;
                const paymentTxn = (order.transactions || []).find(
                    (tx: any) => tx?.status === 'COMPLETED' || tx?.status === 'REFUNDED'
                );
                const hasCompletedPayment = Boolean(paymentTxn);
                const paidStatuses = ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'];
                const wasPaid = isCancelled
                    ? hasCompletedPayment
                    : paidStatuses.includes(order.status);
                const paymentDateSource = paymentTxn?.paidAt || order.updatedAt;
                const paymentDate = wasPaid
                    ? dayjs(paymentDateSource).format('DD/MM/YYYY - HH:mm')
                    : '';

                type MilestoneStep = {
                    label: string;
                    date: string;
                    completed: boolean;
                    variant: 'success' | 'error';
                };

                const cancelDate = order.cancelledAt
                    ? dayjs(order.cancelledAt).format('DD/MM/YYYY - HH:mm')
                    : dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm');

                let steps: MilestoneStep[];
                if (isCancelled && !wasPaid) {
                    steps = [
                        {
                            label: 'Đã đặt đơn',
                            date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
                            completed: true,
                            variant: 'success',
                        },
                        {
                            label: 'Đã huỷ',
                            date: cancelDate,
                            completed: true,
                            variant: 'error',
                        },
                    ];
                } else if (isCancelled && wasPaid) {
                    steps = [
                        {
                            label: 'Đã đặt đơn',
                            date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
                            completed: true,
                            variant: 'success',
                        },
                        {
                            label: 'Đã thanh toán',
                            date: paymentDate,
                            completed: true,
                            variant: 'success',
                        },
                        {
                            label: 'Đã huỷ',
                            date: cancelDate,
                            completed: true,
                            variant: 'error',
                        },
                    ];
                } else {
                    steps = [
                        {
                            label: 'Đã đặt đơn',
                            date: dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm'),
                            completed: true,
                            variant: 'success',
                        },
                        {
                            label: 'Đã thanh toán',
                            date: paymentDate,
                            completed: wasPaid,
                            variant: 'success',
                        },
                        {
                            label: 'Đang chuẩn bị',
                            date: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                ? dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm')
                                : '',
                            completed: ['PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status),
                            variant: 'success',
                        },
                        {
                            label: 'Chờ nhận vé',
                            date: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                ? dayjs(order.updatedAt).format('DD/MM/YYYY - HH:mm')
                                : '',
                            completed: ['PENDING_PICKUP', 'COMPLETED'].includes(order.status),
                            variant: 'success',
                        },
                    ];
                }

                const completedCount = steps.filter((s) => s.completed).length;
                const trackProgress =
                    steps.length <= 1
                        ? 0
                        : ((Math.max(completedCount - 1, 0)) / (steps.length - 1)) * 76;
                const stepWidth = `${100 / steps.length}%`;

                return (
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
                            width: `${trackProgress}%`,
                            height: 2, 
                            bgcolor: isCancelled ? 'var(--palette-error-main)' : 'var(--palette-success-main)',
                            zIndex: 0,
                            transition: 'width 0.3s ease'
                        }} />

                        {steps.map((step, index) => {
                            const accent = step.variant === 'error'
                                ? 'var(--palette-error-main)'
                                : 'var(--palette-success-main)';
                            return (
                            <Box key={index} sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: stepWidth }}>
                                <Box sx={{ 
                                    width: 32, 
                                    height: 32, 
                                    borderRadius: '50%', 
                                    bgcolor: 'white',
                                    border: step.completed ? `2px solid ${accent}` : '2px solid #DFE3E8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 1.5
                                }}>
                                    {step.completed ? 
                                        <Icon
                                            icon={step.variant === 'error' ? 'solar:close-circle-bold' : 'solar:check-read-linear'}
                                            color={accent}
                                            width={20}
                                        /> :
                                        <Icon icon="solar:lock-password-linear" color="#919EAB" width={16} />
                                    }
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)', mb: 0.5, fontSize: '0.8125rem' }}>{step.label}</Typography>
                                {step.date && <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>{step.date}</Typography>}
                            </Box>
                            );
                        })}
                    </Box>
                </Card>
                );
            })()}

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
                                            toast.success("Đã sao chép mã đơn hàng");
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
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>
                                        {order.actualPickedUpAt ? 'Giờ lấy vé (Thực tế)' : 'Giờ lấy vé (Dự kiến)'}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Icon icon="solar:clock-circle-bold-duotone" width={18} style={{ color: 'var(--palette-text-secondary)' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                            {order.actualPickedUpAt 
                                                ? dayjs(order.actualPickedUpAt).format("DD/MM/YYYY HH:mm") 
                                                : (order.expectedPickupAt ? dayjs(order.expectedPickupAt).format("DD/MM/YYYY HH:mm") : "Chưa xác định")}
                                        </Typography>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Loại đơn</Typography>
                                    <Chip
                                        label={order.orderType === 'DIRECT' ? 'Tại quầy' : 'Trực tuyến'}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: order.orderType === 'DIRECT' ? "var(--palette-info-dark)" : "var(--palette-primary-dark)",
                                            bgcolor: order.orderType === 'DIRECT' ? "var(--palette-info-lighter)" : "var(--palette-primary-lighter)",
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

                        {/* Danh sách vé Card / Inspection Section */}
                        {isInspectionStarted && order.status === OrderStatus.PREPARING ? (
                            <OrderInspectionSection
                                orderId={order.id}
                                orderCode={order.orderCode}
                                orderDetails={order.orderDetails || []}
                                orderInfo={{
                                    customerName:
                                        order.name ||
                                        order.user?.fullName ||
                                        'Khách vãng lai',
                                    phone:
                                        order.phone ||
                                        order.user?.phone ||
                                        order.user?.phoneNumber,
                                    email: order.user?.email,
                                    status: order.status,
                                    statusLabel: currentStatus.label,
                                    paymentStatusLabel:
                                        PAYMENT_STATUS_OPTIONS[paymentStatus]?.label ||
                                        'Đã thanh toán',
                                    createdAt: order.createdAt,
                                    totalAmount: order.totalAmount,
                                    orderType: order.orderType,
                                }}
                                onSuccess={() => refetch()}
                                onCancel={() => setIsInspectionStarted(false)}
                                onMoveToReadyForPickup={() => handleStatusChange(OrderStatus.PENDING_PICKUP)}
                            />
                        ) : (
                            <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 3, px: 3, pb: 3 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Icon icon="solar:ticket-bold-duotone" width={24} style={{ color: 'var(--palette-success-main)' }} />
                                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>Danh sách vé</Typography>
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', ml: 1 }}>({order.orderDetails?.length || 0} vé)</Typography>
                                    </Stack>
                                    {order.status === OrderStatus.PREPARING && (
                                        <Button 
                                            variant="contained" 
                                            startIcon={<Icon icon="solar:magnifer-zoom-in-bold-duotone" />}
                                            onClick={() => setIsInspectionStarted(true)}
                                            sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none', bgcolor: 'var(--palette-grey-800)', color: 'common.white', '&:hover': { bgcolor: 'var(--palette-grey-900)' } }}
                                        >
                                            Bắt đầu kiểm tra
                                        </Button>
                                    )}
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
                                                <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Hoạt động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(order.orderDetails || []).map((detail: any) => {
                                                const allocatedSerial = detail.allocatedSerials?.[0];
                                                const serialStatus =
                                                    detail.serialStatus
                                                    || allocatedSerial?.status
                                                    || null;
                                                const serialStatusLabel =
                                                    detail.serialStatusDisplayName
                                                    || allocatedSerial?.statusDisplayName
                                                    || null;
                                                const serialBadge = resolveLotteryTicketSerialStatusBadge(
                                                    serialStatus,
                                                    serialStatusLabel
                                                );
                                                const activityBadge = resolveOrderDetailStatusBadge(detail.status);

                                                return (
                                                <TableRow key={detail.id || detail.lotteryTicketSerialId || detail.serialNumber} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell align="center">
                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                                            <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: '#ee1314', color: 'white' }}>
                                                                <Icon icon="solar:ticket-bold-duotone" width={20} />
                                                            </Avatar>
                                                            <Box sx={{ textAlign: 'left' }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                                    {detail.numbers || detail.lotteryTicket?.numbers || detail.lotteryTicket?.symbol || detail.lotteryTicket?.ticketNumber || 'N/A'}
                                                                </Typography>
                                                                {(detail.serialNumber
                                                                    || detail.replacedByTicketSerial?.serialNumber
                                                                    || detail.replaceTicketSerial?.serialNumber
                                                                    || detail.lotteryTicketSerial?.serialNumber) && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        SN: {detail.serialNumber
                                                                            || detail.replacedByTicketSerial?.serialNumber
                                                                            || detail.replaceTicketSerial?.serialNumber
                                                                            || detail.lotteryTicketSerial?.serialNumber}
                                                                        {detail.replacedByTicketSerialId || detail.replacedByTicketSerial || detail.replaceTicketSerial ? ' (đã thay)' : ''}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {detail.stationName || detail.lotteryTicket?.province?.name || detail.lotteryTicket?.station?.name || detail.lotteryTicket?.stationName || 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                            {(detail.drawDate || detail.lotteryTicket?.drawDate)
                                                                ? dayjs(detail.drawDate || detail.lotteryTicket?.drawDate).format("DD/MM/YYYY")
                                                                : 'N/A'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                            {(detail.drawDate || detail.lotteryTicket?.drawDate)
                                                                ? dayjs(detail.drawDate || detail.lotteryTicket?.drawDate).locale('vi').format("dddd")
                                                                : 'N/A'}
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
                                                        <Chip
                                                            label={serialBadge.label}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                height: 24,
                                                                fontSize: '0.75rem',
                                                                borderRadius: '6px',
                                                                color: serialBadge.color,
                                                                bgcolor: serialBadge.bgcolor,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={activityBadge.label}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                height: 24,
                                                                fontSize: '0.75rem',
                                                                borderRadius: '6px',
                                                                color: activityBadge.color,
                                                                bgcolor: activityBadge.bgcolor,
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                                        Tổng số vé: {order.orderDetails?.length || 0}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>Tổng tiền:</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-success-main)' }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Card>
                        )}

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
                                            {order.name || order.user?.fullName || "Khách vãng lai"}
                                        </Typography>
                                    </Stack>
                                    {(order.phone || order.user?.phone || order.user?.phoneNumber) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                            {order.phone || order.user?.phone || order.user?.phoneNumber}
                                        </Typography>
                                    )}
                                    {(order.email || order.user?.email) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                            {order.email || order.user?.email}
                                        </Typography>
                                    )}
                                    {(order.address || order.user?.address) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5, lineHeight: 1.5 }}>
                                            {order.address || order.user?.address}
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                            
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                startIcon={<Icon icon="solar:user-id-linear" />}
                                disabled={!(order.user?.id || order.userId)}
                                onClick={() => navigate(`/${prefixAdmin}/account-user/detail/${order.user?.id || order.userId}`)}
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
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.5 }}>Phương thức</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                        {resolveOrderPaymentMethodLabel(order.transactions, order.orderType)}
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

            <OrderHandoverConfirmDialog
                open={handoverDialogOpen}
                onClose={() => setHandoverDialogOpen(false)}
                onConfirm={() => {
                    updateStatus(
                        { id: order.id, status: OrderStatus.COMPLETED },
                        { onSuccess: () => toast.success("Cập nhật trạng thái thành công") }
                    );
                }}
            />
        </Box>
    );
};
