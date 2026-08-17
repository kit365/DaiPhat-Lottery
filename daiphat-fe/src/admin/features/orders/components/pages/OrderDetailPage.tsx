"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
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
    alpha,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from "dayjs";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import {
    useConfirmOrderHandover,
    useOrderDetail,
    useUpdateOrderStatus,
    useUploadOrderHandoverEvidence,
    useReviewPaymentTimeoutComplaint,
} from "../../hooks/useOrder";
import {
    OrderStatus,
    getOrderDetailStatusAdminBadgeModifier,
    getOrderTypeLabel,
    ORDER_TYPE_CHIP_STYLES,
    OrderType,
    resolveOrderDetailStatusBadge,
} from "../../../../../types/order.type";
import { resolveLotteryTicketSerialAdminBadge } from "../../utils/lotteryTicketSerialAdminBadge.util";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../../../constants/routes";
import { AdminConfirmDialog } from "../../../../components/ui/AdminConfirmDialog";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { OrderInspectionSection } from "../sections/OrderInspectionSection";
import { OrderHandoverConfirmDialog } from "../sections/OrderHandoverConfirmDialog";
import { OrderHandoverDialog } from "../sections/OrderHandoverDialog";
import { OrderSteppersCard } from "../sections/OrderSteppersCard";
import { getOrderStatusBadge, getOrderStatusAdminBadgeModifier } from '@/shared/components/StatusBadge/orderStatusMap';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import { resolveOrderPaymentMethodLabel } from '@/admin/features/orders/utils/orderPayment.util';

const PAYMENT_STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    unpaid: { label: "Chưa thanh toán", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    partially_paid: { label: "Thanh toán một phần", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    paid: { label: "Đã thanh toán", color: "var(--palette-success-main)", bg: "rgba(34, 197, 94, 0.16)" },
    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
};

export const OrderDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const { data: orderRes, isLoading, refetch } = useOrderDetail(id || "");
    const order = orderRes?.data;
    const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateOrderStatus();
    const [isInspectionStarted, setIsInspectionStarted] = useState(false);
    const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
    const [legacyHandoverDialogOpen, setLegacyHandoverDialogOpen] = useState(false);
    const uploadEvidenceMutation = useUploadOrderHandoverEvidence();
    const confirmHandoverMutation = useConfirmOrderHandover();
    const reviewComplaintMutation = useReviewPaymentTimeoutComplaint();
    const [complaintReviewOpen, setComplaintReviewOpen] = useState(false);
    const [complaintReviewApproved, setComplaintReviewApproved] = useState<boolean | null>(null);
    const [complaintReviewReason, setComplaintReviewReason] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        content: string;
        onConfirm: () => void;
        confirmLabel?: string;
        confirmColor?: 'primary' | 'error';
    }>({
        open: false,
        title: '',
        content: '',
        onConfirm: () => {},
    });

    const handleBaoLoiHuyDon = () => {
        if (!order) return;
        router.push(`/${prefixAdmin}/order/detail/${order.id}/cancel-with-refund`);
    };

    if (isLoading) {
        return (
            <Box>
                <PageHeader
                    title={`Đơn hàng #${id}`}
                    breadcrumbItems={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}/dashboard` },
                        { label: 'Đơn hàng', to: `/${prefixAdmin}/order/list` },
                        { label: 'Chi tiết đơn hàng' }
                    ]}
                />
                <SpinnerLoading />
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

    const openComplaintReview = (approved: boolean) => {
        setComplaintReviewApproved(approved);
        setComplaintReviewReason('');
        setComplaintReviewOpen(true);
    };

    const submitComplaintReview = () => {
        if (!order || complaintReviewApproved === null) return;
        if (!complaintReviewApproved && !complaintReviewReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối chứng từ.');
            return;
        }

        reviewComplaintMutation.mutate(
            {
                id: order.id,
                approved: complaintReviewApproved,
                reason: complaintReviewReason.trim() || undefined,
            },
            {
                onSuccess: (response) => {
                    if (response.success === false || response.isSuccess === false) {
                        toast.error(response.message || 'Không thể xử lý chứng từ.');
                        return;
                    }
                    setComplaintReviewOpen(false);
                    toast.success(complaintReviewApproved ? 'Đã xác nhận thanh toán cho đơn hàng.' : 'Đã từ chối chứng từ thanh toán.');
                    void refetch();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Không thể xử lý chứng từ. Vui lòng thử lại.');
                },
            },
        );
    };

    const handleStatusChange = (newStatus: string) => {
        const update = () => {
            updateStatus({ id: order.id, status: newStatus as OrderStatus }, {
                onSuccess: () => {
                    toast.success("Cập nhật trạng thái thành công");
                    setConfirmModal((prev) => ({ ...prev, open: false }));
                },
                onError: (error: any) => {
                    toast.error(
                        error?.response?.data?.message
                        || "Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại."
                    );
                },
            });
        };

        if (newStatus === OrderStatus.PREPARING) {
            setConfirmModal({
                open: true,
                title: "Bắt đầu chuẩn bị?",
                content: "Xác nhận bắt đầu chuẩn bị đơn hàng này.",
                confirmLabel: "Bắt đầu chuẩn bị",
                confirmColor: "primary",
                onConfirm: update,
            });
        } else if (newStatus === OrderStatus.PENDING_PICKUP) {
            setConfirmModal({
                open: true,
                title: "Chuyển sang Chờ nhận vé?",
                content: "Bạn có chắc chắn muốn chuyển trạng thái thành chờ nhận vé?",
                confirmLabel: "Xác nhận",
                confirmColor: "primary",
                onConfirm: update,
            });
        } else if (newStatus === OrderStatus.COMPLETED) {
            if (order.orderType === 'ONLINE') {
                if (order.status === OrderStatus.PENDING_PICKUP) {
                    setHandoverDialogOpen(true);
                    return;
                }
            } else if (order.status === OrderStatus.PENDING_PICKUP) {
                // Direct orders still need a physical handover acknowledgement
                // and evidence before the status is closed.
                setLegacyHandoverDialogOpen(true);
                return;
            }
            setConfirmModal({
                open: true,
                title: "Hoàn thành đơn hàng?",
                content: "Bạn có chắc chắn muốn xác nhận hoàn thành đơn hàng này?",
                confirmLabel: "Hoàn thành",
                confirmColor: "primary",
                onConfirm: update,
            });
        } else {
            update();
        }
    };

    const paymentStatus = order.status === OrderStatus.PENDING_PAYMENT ? 'unpaid' : 
                          order.status === OrderStatus.CANCELLED ? 'refunded' : 'paid';

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            {/* Unified Header section */}
            <PageHeader
                title={`Đơn hàng #${order.orderCode || order.id?.slice(-6).toUpperCase() || 'ERROR'}`}
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}/dashboard` },
                    { label: 'Đơn hàng', to: `/${prefixAdmin}/order/list` },
                    { label: 'Chi tiết đơn hàng' }
                ]}
                action={
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING && (
                        <CanAccess permission={PERMISSIONS.ORDER.EDIT}>
                            <Button
                                variant="contained"
                                startIcon={<Icon icon="solar:document-check-bold-duotone" />}
                                onClick={() => openComplaintReview(true)}
                                sx={{ height: 36, px: 2, borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none', bgcolor: 'var(--palette-warning-main)', color: 'var(--palette-warning-contrastText)', '&:hover': { bgcolor: 'var(--palette-warning-dark)' } }}
                            >
                                Xác minh chứng từ
                            </Button>
                        </CanAccess>
                    )}
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
                            {order.orderType === 'ONLINE' ? 'Xác nhận bàn giao' : 'Hoàn thành đơn hàng'}
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
                        onClick={() => router.back()} 
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
                }
            />

            {/* Stepper Card (Full Width) */}
            <OrderSteppersCard order={order} />

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
                                        label={getOrderTypeLabel(order.orderType)}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: ORDER_TYPE_CHIP_STYLES[
                                                order.orderType === OrderType.DIRECT
                                                    ? OrderType.DIRECT
                                                    : OrderType.ONLINE
                                            ].color,
                                            bgcolor: ORDER_TYPE_CHIP_STYLES[
                                                order.orderType === OrderType.DIRECT
                                                    ? OrderType.DIRECT
                                                    : OrderType.ONLINE
                                            ].bgcolor,
                                        }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Trạng thái</Typography>
                                    <AdminStatusBadge
                                        label={getOrderStatusBadge(order.status).label}
                                        modifier={getOrderStatusAdminBadgeModifier(order.status)}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

                            <Box>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Ghi chú</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                    {(order as any).note || "Không có"}
                                </Typography>
                            </Box>
                        </Card>

                        {order.handoverEvidenceUrl && (
                            <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                    <Box>
                                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                            Ảnh xác nhận bàn giao
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5 }}>
                                            Bằng chứng do nhân viên lưu khi khách nhận vé.
                                        </Typography>
                                    </Box>
                                    <Button
                                        component="a"
                                        href={order.handoverEvidenceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="outlined"
                                        startIcon={<Icon icon="solar:gallery-wide-bold-duotone" />}
                                        sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                                    >
                                        Mở ảnh bàn giao
                                    </Button>
                                </Stack>
                            </Card>
                        )}

                        {(order.paymentComplaintEvidenceUrl || order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING) && (
                            <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                                <Stack spacing={2}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                        <Box>
                                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                Chứng từ thanh toán ngoại lệ
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5 }}>
                                                Khách gửi biên lai sau khi đơn bị hệ thống hủy do quá thời gian thanh toán.
                                            </Typography>
                                        </Box>
                                        <AdminStatusBadge
                                            label={getOrderStatusBadge(order.status).label}
                                            modifier={getOrderStatusAdminBadgeModifier(order.status)}
                                        />
                                    </Stack>
                                    {order.paymentComplaintEvidenceUrl && (
                                        <Button
                                            component="a"
                                            href={order.paymentComplaintEvidenceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="outlined"
                                            startIcon={<Icon icon="solar:gallery-wide-bold-duotone" />}
                                            sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                                        >
                                            Mở chứng từ khách gửi
                                        </Button>
                                    )}
                                    {order.paymentComplaintResolutionReason && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-error-dark)', bgcolor: 'var(--palette-error-lighter)', p: 1.5, borderRadius: 1 }}>
                                            Lý do xử lý trước đó: {order.paymentComplaintResolutionReason}
                                        </Typography>
                                    )}
                                    {order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING && (
                                        <CanAccess permission={PERMISSIONS.ORDER.EDIT}>
                                            <Stack direction="row" spacing={1.5}>
                                                <Button variant="contained" color="success" onClick={() => openComplaintReview(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                    Duyệt chứng từ
                                                </Button>
                                                <Button variant="outlined" color="error" onClick={() => openComplaintReview(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                    Từ chối
                                                </Button>
                                            </Stack>
                                        </CanAccess>
                                    )}
                                </Stack>
                            </Card>
                        )}

                        {/* Danh sách vé */}
                        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 3, px: 3, pb: 3 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
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
                                                const ticketCondition =
                                                    detail.ticketCondition
                                                    || allocatedSerial?.ticketCondition
                                                    || null;
                                                const ticketConditionLabel =
                                                    detail.ticketConditionDisplayName
                                                    || allocatedSerial?.ticketConditionDisplayName
                                                    || null;
                                                const serialBadge = resolveLotteryTicketSerialAdminBadge(
                                                    serialStatus,
                                                    serialStatusLabel,
                                                    ticketCondition,
                                                    ticketConditionLabel
                                                );
                                                const activityBadge = resolveOrderDetailStatusBadge(
                                                    detail.status,
                                                    detail.statusDisplayName
                                                );

                                                return (
                                                <TableRow key={detail.id || detail.lotteryTicketSerialId || detail.serialNumber} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell align="center">
                                                        <Box>
                                                            <AdminLuckyDisplay
                                                                value={
                                                                    detail.numbers
                                                                    || detail.lotteryTicket?.numbers
                                                                    || detail.lotteryTicket?.symbol
                                                                    || detail.lotteryTicket?.ticketNumber
                                                                }
                                                                ticket
                                                                fontSize="0.875rem"
                                                                fontWeight={700}
                                                                letterSpacing="0.06em"
                                                                sx={{ color: 'var(--palette-text-primary)' }}
                                                            />
                                                            {(detail.serialNumber
                                                                || detail.replacedByTicketSerial?.serialNumber
                                                                || detail.replaceTicketSerial?.serialNumber
                                                                || detail.lotteryTicketSerial?.serialNumber) && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    component="div"
                                                                    sx={{ mt: 0.25, lineHeight: 1.4, wordBreak: 'break-all' }}
                                                                >
                                                                    SN: {detail.serialNumber
                                                                        || detail.replacedByTicketSerial?.serialNumber
                                                                        || detail.replaceTicketSerial?.serialNumber
                                                                        || detail.lotteryTicketSerial?.serialNumber}
                                                                    {detail.replacedByTicketSerialId || detail.replacedByTicketSerial || detail.replaceTicketSerial ? ' (đã thay)' : ''}
                                                                </Typography>
                                                            )}
                                                        </Box>
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
                                                    </TableCell>

                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {(detail.price || 10000).toLocaleString('vi-VN')}đ
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <AdminStatusBadge
                                                            label={serialBadge.label}
                                                            modifier={serialBadge.modifier}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <AdminStatusBadge
                                                            label={activityBadge.label}
                                                            modifier={getOrderDetailStatusAdminBadgeModifier(detail.status)}
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

                        {order.status === OrderStatus.PREPARING && (
                            <OrderInspectionSection
                                open={isInspectionStarted}
                                orderId={order.id}
                                orderCode={order.orderCode}
                                orderDetails={order.orderDetails || []}
                                orderInfo={{
                                    customerName:
                                        order.name ||
                                        (order as any).user?.fullName ||
                                        'Khách vãng lai',
                                    phone:
                                        order.phone ||
                                        (order as any).user?.phone ||
                                        (order as any).user?.phoneNumber,
                                    email: (order as any).user?.email,
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
                                    src={(order as any).user?.avatar}
                                    sx={{ width: 64, height: 64, bgcolor: 'var(--palette-background-neutral)', color: 'var(--palette-text-secondary)' }}
                                >
                                    <Icon icon="solar:user-rounded-bold" width={32} />
                                </Avatar>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                            {order.name || (order as any).user?.fullName || "Khách vãng lai"}
                                        </Typography>
                                    </Stack>
                                    {(order.phone || (order as any).user?.phone || (order as any).user?.phoneNumber) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                            {order.phone || (order as any).user?.phone || (order as any).user?.phoneNumber}
                                        </Typography>
                                    )}
                                    {((order as any).email || (order as any).user?.email) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)', fontWeight: 500 }}>
                                            {(order as any).email || (order as any).user?.email}
                                        </Typography>
                                    )}
                                    {((order as any).address || (order as any).user?.address) && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mt: 0.5, lineHeight: 1.5 }}>
                                            {(order as any).address || (order as any).user?.address}
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                            
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                startIcon={<Icon icon="solar:user-id-linear" />}
                                disabled={!((order as any).user?.id || (order as any).userId)}
                                onClick={() => router.push(`/${prefixAdmin}/account-user/detail/${(order as any).user?.id || (order as any).userId}`)}
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
                                        {['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                            ? dayjs((order as any).updatedAt).format("DD/MM/YYYY - HH:mm")
                                            : order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING
                                                ? 'Đang chờ xác minh'
                                                : "Chưa thanh toán"}
                                    </Typography>
                                </Box>
                                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}>Trạng thái thanh toán</Typography>
                                    <Chip
                                        label={order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING
                                            ? 'Đang chờ xác minh'
                                            : ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                                ? "Đã thanh toán"
                                                : "Chưa thanh toán"}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.75rem',
                                            borderRadius: '6px',
                                            color: order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING
                                                ? "var(--palette-warning-dark)"
                                                : ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                                    ? "var(--palette-success-dark)"
                                                    : "var(--palette-warning-dark)",
                                            bgcolor: order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING
                                                ? "var(--palette-warning-lighter)"
                                                : ['PAID', 'PREPARING', 'PENDING_PICKUP', 'COMPLETED'].includes(order.status)
                                                    ? "var(--palette-success-lighter)"
                                                    : "var(--palette-warning-lighter)",
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            <OrderHandoverConfirmDialog
                open={legacyHandoverDialogOpen}
                existingEvidenceUrl={order.handoverEvidenceUrl}
                loading={uploadEvidenceMutation.isPending}
                onClose={() => setLegacyHandoverDialogOpen(false)}
                onUploadEvidence={(file) => uploadEvidenceMutation.mutateAsync({ id: order.id, file })}
                onConfirm={() => {
                    updateStatus(
                        { id: order.id, status: OrderStatus.COMPLETED },
                        {
                            onSuccess: () => {
                                setLegacyHandoverDialogOpen(false);
                                toast.success("Đã xác nhận bàn giao và hoàn thành đơn hàng");
                                refetch();
                            },
                            onError: (error: any) => {
                                toast.error(
                                    error?.response?.data?.message ||
                                    "Không thể hoàn tất đơn hàng. Vui lòng tải lại và thử lại.",
                                );
                            },
                        }
                    );
                }}
            />
            <OrderHandoverDialog
                open={handoverDialogOpen}
                orderDetails={order.orderDetails || []}
                existingEvidenceUrl={order.handoverEvidenceUrl}
                loading={confirmHandoverMutation.isPending}
                onClose={() => setHandoverDialogOpen(false)}
                onUploadEvidence={(file) => uploadEvidenceMutation.mutateAsync({ id: order.id, file })}
                onConfirm={(payload) => {
                    confirmHandoverMutation.mutate(
                        { id: order.id, data: payload },
                        {
                            onSuccess: () => {
                                setHandoverDialogOpen(false);
                                toast.success("Đã chốt bàn giao vé");
                                refetch();
                            },
                            onError: (error: any) => {
                                toast.error(
                                    error?.response?.data?.message ||
                                    "Không thể chốt bàn giao. Vui lòng tải lại đơn và kiểm tra lại.",
                                );
                            },
                        },
                    );
                }}
            />

            <Dialog
                open={complaintReviewOpen}
                onClose={() => !reviewComplaintMutation.isPending && setComplaintReviewOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle sx={{ pb: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: complaintReviewApproved ? 'var(--palette-success-lighter, #E8F5E9)' : 'var(--palette-error-lighter, #FFEBEE)',
                                color: complaintReviewApproved ? 'var(--palette-success-dark, #2E7D32)' : 'var(--palette-error-dark, #C62828)',
                            }}
                        >
                            <Icon icon={complaintReviewApproved ? "solar:check-circle-bold" : "solar:close-circle-bold"} width={22} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                {complaintReviewApproved ? 'Xác nhận chứng từ thanh toán' : 'Từ chối chứng từ thanh toán'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                                Đơn {order?.orderCode || order?.id}
                            </Typography>
                        </Box>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 3 }}>
                    {order?.paymentComplaintEvidenceUrl && (
                        <Box
                            sx={{
                                mb: 2.5,
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: 'var(--palette-background-neutral, #F4F6F8)',
                                border: '1px solid var(--palette-divider, #E5E8EB)',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Icon icon="solar:gallery-wide-bold-duotone" width={18} />
                                    Ảnh chứng từ thanh toán của khách
                                </Typography>
                                <Button
                                    component="a"
                                    href={order.paymentComplaintEvidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Icon icon="solar:square-arrow-right-up-bold" width={16} />}
                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0.25 }}
                                >
                                    Mở ảnh gốc
                                </Button>
                            </Stack>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    maxHeight: 340,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    bgcolor: '#0F172A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Box
                                    component="img"
                                    src={order.paymentComplaintEvidenceUrl}
                                    alt="Chứng từ thanh toán"
                                    sx={{
                                        maxWidth: '100%',
                                        maxHeight: 340,
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                            {order.totalAmount != null && (
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed var(--palette-divider)' }}>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                                        Tổng tiền đơn hàng cần khớp:
                                    </Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main, #00A76F)' }}>
                                        {order.totalAmount.toLocaleString('vi-VN')}đ
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    )}
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mb: 2 }}>
                        {complaintReviewApproved
                            ? 'Sau khi duyệt, đơn sẽ chuyển sang Đã thanh toán và hệ thống ghi nhận giao dịch thanh toán online.'
                            : 'Nhập lý do để khách biết vì sao chứng từ chưa được chấp nhận.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label={complaintReviewApproved ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối'}
                        value={complaintReviewReason}
                        onChange={(event) => setComplaintReviewReason(event.target.value)}
                        required={!complaintReviewApproved}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setComplaintReviewOpen(false)} disabled={reviewComplaintMutation.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color={complaintReviewApproved ? 'success' : 'error'}
                        onClick={submitComplaintReview}
                        disabled={reviewComplaintMutation.isPending || complaintReviewApproved === null}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        {reviewComplaintMutation.isPending && <Icon icon="line-md:loading-twotone-loop" width={18} />}
                        {complaintReviewApproved ? 'Duyệt chứng từ' : 'Từ chối chứng từ'}
                    </Button>
                </DialogActions>
            </Dialog>

            <AdminConfirmDialog
                open={confirmModal.open}
                title={confirmModal.title}
                onClose={() => !isUpdatingStatus && setConfirmModal((prev) => ({ ...prev, open: false }))}
                onConfirm={confirmModal.onConfirm}
                confirmLabel={confirmModal.confirmLabel || "Xác nhận"}
                confirmColor={confirmModal.confirmColor || "primary"}
                loading={isUpdatingStatus}
            >
                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                    {confirmModal.content}
                </Typography>
            </AdminConfirmDialog>
        </Box>
    );
};
