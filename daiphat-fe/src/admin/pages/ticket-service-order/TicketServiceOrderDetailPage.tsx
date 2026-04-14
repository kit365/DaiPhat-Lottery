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
import { useTicketServiceOrderDetail, useUpdateTicketServiceOrderStatus, useUpdateTicketServiceOrder, useTicketServiceOrders, useApplyOptimization } from "./hooks/useTicketServiceOrderManagement";
import { useNotifications } from "../../hooks/useNotification";
import { toast } from "react-toastify";
import { prefixAdmin } from "../../constants/routes";
import { confirmAction, confirmInputText } from "../../utils/swal";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, AlertTitle } from "@mui/material";
import { apiApp } from "../../../api/index";

const STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
    delayed: { label: "Trễ hẹn", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    "in-progress": { label: "Đang thực hiện", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    request_cancel: { label: "Yêu cầu hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const PAYMENT_STATUS_OPTIONS: { [key: string]: { label: string; color: string; bg: string } } = {
    unpaid: { label: "Chưa thanh toán", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    partially_paid: { label: "Thanh toán một phần", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    paid: { label: "Đã thanh toán", color: "var(--palette-success-main)", bg: "rgba(34, 197, 94, 0.16)" },
    refunded: { label: "Đã hoàn tiền", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
};




const BulkRescheduleDialog = ({ open, onClose, affectedTicketServiceOrders, onConfirm }: any) => {
    const [minutes, setMinutes] = useState(15);

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '16px', p: 1, width: '400px' } }}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="solar:history-bold" color="var(--palette-error-main)" />
                Dời lịch hàng loạt
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 3, color: 'var(--palette-text-secondary)' }}>
                    Nhập số phút bạn muốn dời cho <b>{affectedTicketServiceOrders.length}</b> lịch đặt bị ảnh hưởng.
                </Typography>
                <TextField
                    fullWidth
                    label="Số phút dời thêm"
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    slotProps={{ input: { sx: { fontWeight: 700 } } }}
                    helperText="Tất cả giờ bắt đầu và kết thúc của các ca sau sẽ được cộng thêm số phút này."
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} sx={{ color: 'var(--palette-text-secondary)', fontWeight: 700 }}>Hủy</Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => onConfirm(minutes)}
                    sx={{ fontWeight: 800, borderRadius: '8px' }}
                >
                    Xác nhận dời {minutes}p
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const TicketServiceOrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: ticketServiceOrderRes, isLoading, refetch } = useTicketServiceOrderDetail(id || "");
    const ticketServiceOrder = ticketServiceOrderRes?.data;
    const { mutate: updateStatus } = useUpdateTicketServiceOrderStatus();
    const { mutate: updateTicketServiceOrder } = useUpdateTicketServiceOrder();
    const { mutate: applyOpt, isPending: isApplyingOpt } = useApplyOptimization();
    const { data: notificationsRes } = useNotifications();
    const notifications = notificationsRes?.data || [];
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

    // Tìm các gợi ý tối ưu cho đơn hàng này
    const suggestions = notifications.filter((n: any) =>
        n.metadata?.ticketServiceOrderId === id &&
        n.metadata?.type === "optimization_suggestion" &&
        n.status === "unread" &&
        !['completed', 'cancelled'].includes(ticketServiceOrder?.ticketServiceOrderStatus)
    );

    const staffIdsMap = Array.from(new Set(ticketServiceOrder?.ticketStaffMap?.map((m: any) => m.staffId?._id || m.staffId).filter(Boolean))) as string[];

    const { data: affectedRes } = useTicketServiceOrders(staffIdsMap.length > 0 ? {
        staffIds: staffIdsMap.join(','),
        status: 'pending,confirmed,in-progress',
        date: dayjs(ticketServiceOrder?.start).format('YYYY-MM-DD'),
        limit: 50
    } : null);

    const ticketServiceOrders = affectedRes?.data?.recordList || [];
    const affectedList = ticketServiceOrders.filter((b: any) =>
        b._id !== id &&
        dayjs(b.start).isBefore(dayjs(ticketServiceOrder?.expectedFinish || ticketServiceOrder?.end)) &&
        dayjs(b.end).isAfter(dayjs(ticketServiceOrder?.actualStart || ticketServiceOrder?.start))
    );

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!ticketServiceOrder) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--palette-text-primary)' }}>Không tìm thấy đơn dịch vụ</Typography>
            </Box>
        );
    }

    const currentStatus = STATUS_OPTIONS[ticketServiceOrder.ticketServiceOrderStatus] || STATUS_OPTIONS.pending;

    const handleStatusChange = (newStatus: string) => {
        const update = () => {
            updateStatus({ id: ticketServiceOrder._id, status: newStatus }, {
                onSuccess: () => toast.success("Cập nhật trạng thái thành công")
            });
        };

        if (newStatus === 'in-progress') {
            confirmAction(
                "Bắt đầu thực hiện?",
                "Xác nhận đơn dịch vụ này bắt đầu được thực hiện ngay bây giờ.",
                update,
                'info'
            );
        } else if (newStatus === 'completed') {
            confirmAction(
                "Hoàn thành dịch vụ?",
                "Bạn có chắc chắn muốn xác nhận hoàn thành đơn dịch vụ này?",
                update,
                'success'
            );
        } else if (newStatus === 'cancelled') {
            confirmInputText(
                "Xác nhận hủy đơn",
                "Nhập lý do hủy đơn",
                "Ví dụ: Vé số không đủ tuổi",
                (reason) => {
                    updateStatus({ id: ticketServiceOrder._id, status: newStatus, reason: reason || "Hủy bởi Admin" }, {
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

    const handlePaymentStatusChange = (newStatus: string) => {
        if (["paid", "partially_paid"].includes(ticketServiceOrder.paymentStatus) && newStatus === "unpaid") {
            toast.error("Không thể chuyển đơn đã thanh toán (toàn bộ hoặc một phần) về chưa thanh toán!");
            return;
        }

        if (ticketServiceOrder.ticketServiceOrderStatus === 'request_cancel' && newStatus === 'paid') {
            toast.error("Đơn đang yêu cầu hủy không thể chuyển sang trạng thái đã thanh toán!");
            return;
        }

        updateTicketServiceOrder({ id: ticketServiceOrder._id, data: { paymentStatus: newStatus } }, {
            onSuccess: () => toast.success("Cập nhật trạng thái thanh toán thành công")
        });
    };

    const handleBulkReschedule = async (offset: number) => {
        const sid = ticketServiceOrder.staffIds?.[0]?._id || ticketServiceOrder.staffIds?.[0];
        if (!sid) return;

        const loadToast = toast.loading("Đang dời lịch các ca sau...");

        try {
            toast.update(loadToast, { render: "Đang xử lý dời lịch...", type: "info", isLoading: true });

            toast.update(loadToast, {
                render: "Đã dời thành công các lịch sau thêm " + offset + " phút!",
                type: "success",
                isLoading: false,
                autoClose: 3000
            });
            setRescheduleOpen(false);
            refetch();
        } catch (error) {
            toast.update(loadToast, { render: "Lỗi khi dời lịch!", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handlePrint = async () => {
        if (!ticketServiceOrder) return;
        const loadToast = toast.loading("Đang tạo file PDF...");
        try {
            const response = await apiApp.get(`/client/ticketServiceOrder/export-pdf`, {
                params: {
                    ticketServiceOrderCode: ticketServiceOrder.code,
                    phone: ticketServiceOrder.userId?.phone || ticketServiceOrder.customerPhone
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ticketServiceOrder_${ticketServiceOrder.code}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.update(loadToast, { render: "Đã tải xuống phiếu dịch vụ!", type: "success", isLoading: false, autoClose: 2000 });
        } catch (error) {
            console.error("Failed to export ticketServiceOrder pdf:", error);
            toast.update(loadToast, { render: "Xuất PDF thất bại!", type: "error", isLoading: false, autoClose: 2000 });
        }
    };

    const isTerminalStatus = ['completed', 'cancelled'].includes(ticketServiceOrder.ticketServiceOrderStatus);

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
            <BulkRescheduleDialog
                open={rescheduleOpen}
                onClose={() => setRescheduleOpen(false)}
                affectedTicketServiceOrders={affectedList}
                onConfirm={handleBulkReschedule}
            />
            {/* Overrun Warning Banner */}
            {ticketServiceOrder.isOverrun && (
                <Card
                    sx={{
                        mb: 3,
                        p: 2,
                        bgcolor: 'var(--palette-error-lighter)',
                        border: '1px solid var(--palette-error-light)',
                        boxShadow: '0 8px 16px rgba(255, 86, 48, 0.16)'
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '12px',
                                bgcolor: 'var(--palette-error-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}
                        >
                            <Icon icon="solar:danger-bold-duotone" width={28} />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" sx={{ color: 'var(--palette-error-dark)', fontWeight: 800 }}>
                                CẢNH BÁO: DỊCH VỤ ĐANG QUÁ GIỜ!
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--palette-error-main)', fontWeight: 600 }}>
                                Thời gian thực hiện đã vượt quá giới hạn. Lịch tiếp theo của nhân viên này có thể bị ảnh hưởng.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<Icon icon="solar:users-group-rounded-bold" />}
                                onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/edit/${ticketServiceOrder._id}`)}
                                sx={{ fontWeight: 700, borderRadius: '8px' }}
                            >
                                Chỉnh sửa đơn
                            </Button>
                            {affectedList.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    startIcon={<Icon icon="solar:calendar-minimalistic-bold" />}
                                    onClick={() => setRescheduleOpen(true)}
                                    sx={{
                                        fontWeight: 800,
                                        borderRadius: '8px',
                                        bgcolor: 'var(--palette-error-main)',
                                        backgroundImage: 'linear-gradient(135deg, var(--palette-error-main) 0%, var(--palette-error-dark) 100%)',
                                        boxShadow: '0 8px 16px rgba(255, 86, 48, 0.24)'
                                    }}
                                >
                                    Dời {affectedList.length} lịch sau (+Phút)
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Card>
            )}

            {/* Optimization Suggestion Banner */}
            {suggestions.length > 0 && (
                <Alert
                    severity="info"
                    icon={<Icon icon="solar:magic-stick-bold-duotone" width={24} />}
                    sx={{
                        mb: 3,
                        borderRadius: '12px',
                        border: '1px solid var(--palette-info-light)',
                        bgcolor: 'var(--palette-info-lighter)',
                        '& .MuiAlert-message': { width: '100%' }
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 800 }}>Gợi ý tối ưu điều phối nhân sự</AlertTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                            {suggestions[0].content}
                        </Typography>
                        <Button
                            variant="contained"
                            color="info"
                            size="small"
                            loading={isApplyingOpt}
                            onClick={() => {
                                const { targetTicketId, offeringStaffId } = (suggestions[0] as any).metadata;
                                confirmAction(
                                    "Áp dụng tối ưu?",
                                    "Nhân viên mới sẽ được phân công cho vé này để đẩy nhanh tiến độ.",
                                    () => applyOpt({
                                        id: id || "",
                                        data: {
                                            targetTicketId,
                                            newStaffId: offeringStaffId,
                                            notificationId: suggestions[0]._id
                                        }
                                    }),
                                    'info'
                                );
                            }}
                            sx={{ fontWeight: 700, borderRadius: '8px', ml: 2, whiteSpace: 'nowrap' }}
                        >
                            Áp dụng ngay
                        </Button>
                    </Stack>
                </Alert>
            )}

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
                                Đơn dịch vụ #{ticketServiceOrder.code || ticketServiceOrder._id.slice(-6).toUpperCase()}
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
                            {dayjs(ticketServiceOrder.createdAt).format("DD MMM YYYY h:mm a")}
                        </Typography>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Select
                        size="small"
                        value={ticketServiceOrder.ticketServiceOrderStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={isTerminalStatus}
                        sx={{
                            minWidth: 140,
                            height: 36,
                            borderRadius: '8px',
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            '&.Mui-disabled': {
                                opacity: 1,
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: (theme) => alpha(theme.palette.grey[500], 0.12),
                                },
                                '& .MuiSelect-select': {
                                    WebkitTextFillColor: 'var(--palette-text-primary)',
                                }
                            },
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
                        {Object.entries(STATUS_OPTIONS).map(([value, opt]) => {
                            if (isTerminalStatus && value !== ticketServiceOrder.ticketServiceOrderStatus) {
                                return null;
                            }
                            return (
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
                            );
                        })}
                    </Select>
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
                    {!isTerminalStatus && (
                        <Button
                            variant="contained"
                            startIcon={<Icon icon="solar:pen-bold" />}
                            onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/edit/${id}`)}
                            sx={{
                                height: 36,
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                textTransform: 'capitalize',
                                borderRadius: '8px',
                                bgcolor: 'var(--palette-grey-800)',
                                color: 'common.white',
                                '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                            }}
                        >
                            Chỉnh sửa
                        </Button>
                    )}
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Left Column */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Details Card */}
                        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 3, px: 3, pb: 0 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Chi tiết vé số</Typography>
                            </Stack>

                            <Box>
                                {ticketServiceOrder.ticketIds?.map((ticket: any, idx: number) => {
                                    const mapping = ticketServiceOrder.ticketStaffMap?.find((m: any) =>
                                        (m.ticketId?._id || m.ticketId) === (ticket._id || ticket)
                                    );
                                    return (
                                        <Stack
                                            key={idx}
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            sx={{
                                                px: 3,
                                                py: 3,
                                                borderBottom: 'dashed 2px var(--palette-background-neutral)',
                                                position: 'relative',
                                                ...(mapping?.status === 'in-progress' && {
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: '10%',
                                                        height: '80%',
                                                        width: 4,
                                                        bgcolor: 'primary.main',
                                                        borderRadius: '0 4px 4px 0'
                                                    }
                                                })
                                            }}
                                        >
                                            <Box sx={{ position: 'relative' }}>
                                                <Avatar
                                                    src={ticket.avatar}
                                                    variant="rounded"
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        bgcolor: 'background.neutral',
                                                        border: mapping?.status === 'in-progress' ? '2px solid var(--palette-primary-main)' : 'none'
                                                    }}
                                                >
                                                    <Icon icon="solar:ticket-bold-duotone" width={28} />
                                                </Avatar>
                                                {mapping?.status === 'in-progress' && (
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        bottom: -4,
                                                        right: -4,
                                                        width: 16,
                                                        height: 16,
                                                        bgcolor: 'primary.main',
                                                        borderRadius: '50%',
                                                        border: '2px solid white'
                                                    }} />
                                                )}
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>{ticket.name}</Typography>
                                                    {mapping?.status === 'in-progress' && (
                                                        <Chip
                                                            label="Đang làm"
                                                            size="small"
                                                            color="primary"
                                                            sx={{ height: 18, fontSize: '0.625rem', fontWeight: 800 }}
                                                        />
                                                    )}
                                                </Stack>
                                                <Typography sx={{ color: 'var(--palette-text-disabled)', fontSize: '0.875rem', mt: 0.5 }}>
                                                    {ticket.type === 'XSMN' ? 'Miền Nam' : ticket.type === 'XSMB' ? 'Miền Bắc' : 'Miền Trung'} • {ticket.ticketSubtype || "Không xác định"}
                                                </Typography>
                                            </Box>

                                            {/* Staff assigned to this ticket */}
                                            {(() => {
                                                const staffId = mapping?.staffId?._id || mapping?.staffId;
                                                const assignedStaff = (typeof mapping?.staffId === 'object' && mapping.staffId?.fullName)
                                                    ? mapping.staffId
                                                    : (ticketServiceOrder.staffIds?.find((s: any) => (s._id || s) === staffId) || null);

                                                if (!assignedStaff) return null;

                                                return (
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                        onClick={() => navigate(`/${prefixAdmin}/account-admin/detail/${assignedStaff._id || assignedStaff}`)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '&:hover': { opacity: 0.8 },
                                                            bgcolor: 'var(--palette-background-neutral)',
                                                            p: 0.75,
                                                            borderRadius: 1,
                                                            minWidth: 160
                                                        }}
                                                    >
                                                        <Avatar
                                                            src={assignedStaff.avatar}
                                                            sx={{ width: 24, height: 24 }}
                                                        />
                                                        <Box>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1 }}>
                                                                {assignedStaff.fullName}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', fontSize: '0.625rem' }}>
                                                                Nhân viên phụ trách
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                );
                                            })()}

                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 100, textAlign: 'right', color: 'var(--palette-text-primary)' }}>
                                                Dịch vụ chính
                                            </Typography>

                                            {/* Quick Swap Button for suggestions */}
                                            {(() => {
                                                const ticketIdStr = (ticket._id || ticket).toString();
                                                const hasSuggestion = suggestions.find((s: any) => s.metadata?.targetTicketId === ticketIdStr);
                                                if (!hasSuggestion || mapping?.status !== 'pending') return null;

                                                return (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="info"
                                                        startIcon={<Icon icon="solar:user-rounded-bold" />}
                                                        onClick={() => {
                                                            applyOpt({
                                                                id: id || "",
                                                                data: {
                                                                    targetTicketId: ticketIdStr,
                                                                    newStaffId: (hasSuggestion as any).metadata.offeringStaffId,
                                                                    notificationId: hasSuggestion._id
                                                                }
                                                            });
                                                        }}
                                                        sx={{
                                                            ml: 1,
                                                            fontWeight: 700,
                                                            fontSize: '0.75rem',
                                                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                                            color: 'info.main',
                                                            '&:hover': {
                                                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.2),
                                                            },
                                                            boxShadow: 'none'
                                                        }}
                                                    >
                                                        Đổi sang NV rảnh
                                                    </Button>
                                                );
                                            })()}
                                        </Stack>
                                    );
                                })}
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Box sx={{ width: '100%', ml: 'auto', maxWidth: 240 }}>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Tạm tính</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.subTotal || 0)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Giảm giá</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.discount || 0)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>Tổng cộng</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.total || 0)}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Box>
                            </Box>
                        </Card>

                        {/* History Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 3, color: 'var(--palette-text-primary)' }}>Lịch sử thực hiện</Typography>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 7 }}>
                                    <Stack spacing={3}>
                                        <Stack direction="row" spacing={2}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ticketServiceOrder.completedAt ? 'success.main' : 'text.disabled', mt: 1 }} />
                                                <Box sx={{ flexGrow: 1, width: 2, bgcolor: 'background.neutral', my: 1 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: ticketServiceOrder.completedAt ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)' }}>Hoàn thành dịch vụ</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                    {ticketServiceOrder.completedAt ? dayjs(ticketServiceOrder.completedAt).format("DD MMM YYYY h:mm a") : "Chưa hoàn thành"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={2}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ticketServiceOrder.actualStart ? 'info.main' : 'text.disabled', mt: 1 }} />
                                                <Box sx={{ flexGrow: 1, width: 2, bgcolor: 'background.neutral', my: 1 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: ticketServiceOrder.actualStart ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)' }}>Bắt đầu thực hiện</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                    {ticketServiceOrder.actualStart ? dayjs(ticketServiceOrder.actualStart).format("DD MMM YYYY h:mm a") : "Chưa bắt đầu"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={2}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'text.disabled', mt: 1 }} />
                                                <Box sx={{ flexGrow: 1, width: 2, bgcolor: 'background.neutral', my: 1 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ color: 'var(--palette-text-disabled)' }}>Đặt chỗ thành công</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                    {dayjs(ticketServiceOrder.createdAt).format("DD MMM YYYY h:mm a")}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 'var(--shape-borderRadius-md)' }}>
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Thời gian đặt</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                    {dayjs(ticketServiceOrder.createdAt).format("HH:mm - DD/MM/YYYY")}
                                                </Typography>
                                            </Box>
                                            {ticketServiceOrder.originalStart && dayjs(ticketServiceOrder.originalStart).format("HH:mm") !== dayjs(ticketServiceOrder.start).format("HH:mm") && (
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Thời gian bắt đầu gốc</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-secondary)' }}>
                                                        {dayjs(ticketServiceOrder.originalStart).format("HH:mm - DD/MM/YYYY")}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Thời gian thực hiện</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                    {dayjs(ticketServiceOrder.start).format("HH:mm - DD/MM/YYYY")}
                                                </Typography>
                                            </Box>
                                            {ticketServiceOrder.completedAt && (
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Thời gian hoàn thành</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                                        {dayjs(ticketServiceOrder.completedAt).format("HH:mm - DD/MM/YYYY")}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Dịch vụ đăng ký</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-primary-main)' }}>
                                                    {ticketServiceOrder.ticketServiceId?.name || "N/A"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Grid>
                            </Grid>
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
                                    value={ticketServiceOrder.paymentStatus || 'unpaid'}
                                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                    disabled={isTerminalStatus}
                                    sx={{
                                        minWidth: 140,
                                        height: 32,
                                        borderRadius: '8px',
                                        '&.Mui-disabled': {
                                            opacity: 1,
                                            '& .MuiSelect-select': {
                                                WebkitTextFillColor: (PAYMENT_STATUS_OPTIONS[ticketServiceOrder.paymentStatus] || PAYMENT_STATUS_OPTIONS.unpaid).color,
                                            }
                                        },
                                        '& .MuiSelect-select': {
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            py: 0.5,
                                            px: 1,
                                            color: (PAYMENT_STATUS_OPTIONS[ticketServiceOrder.paymentStatus] || PAYMENT_STATUS_OPTIONS.unpaid).color,
                                            bgcolor: (PAYMENT_STATUS_OPTIONS[ticketServiceOrder.paymentStatus] || PAYMENT_STATUS_OPTIONS.unpaid).bg,
                                        }
                                    }}
                                >
                                    {Object.entries(PAYMENT_STATUS_OPTIONS).map(([value, opt]) => {
                                        if (isTerminalStatus && value !== (ticketServiceOrder.paymentStatus || 'unpaid')) {
                                            return null;
                                        }
                                        if (value === 'partially_paid' && !(ticketServiceOrder.depositAmount > 0)) {
                                            return null;
                                        }
                                        if (value === 'refunded' && !['request_cancel', 'cancelled'].includes(ticketServiceOrder.ticketServiceOrderStatus)) {
                                            return null;
                                        }

                                        if (ticketServiceOrder.ticketServiceOrderStatus === 'request_cancel' && ['paid'].includes(value)) {
                                            return null;
                                        }

                                        return (
                                            <MenuItem
                                                key={value}
                                                value={value}
                                                sx={{ fontSize: '0.875rem' }}
                                                disabled={(ticketServiceOrder.paymentStatus === 'paid' || ticketServiceOrder.paymentStatus === 'partially_paid') && value === 'unpaid'}
                                            >
                                                {opt.label}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Phương thức</Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {ticketServiceOrder.paymentMethod === 'money' ? 'Tiền mặt' :
                                            ticketServiceOrder.paymentMethod === 'vnpay' ? 'VNPay' :
                                                ticketServiceOrder.paymentMethod === 'zalopay' ? 'ZaloPay' : 'Chưa giao dịch'}
                                    </Typography>
                                    <Icon
                                        icon={
                                            ticketServiceOrder.paymentMethod === 'money' ? 'solar:hand-money-bold' :
                                                ticketServiceOrder.paymentMethod === 'vnpay' ? 'logos:vnpay' :
                                                    'logos:zalopay'
                                        }
                                        width={ticketServiceOrder.paymentMethod === 'money' ? 20 : 28}
                                        style={{ filter: ticketServiceOrder.paymentMethod === 'money' ? 'grayscale(1)' : 'none', opacity: ticketServiceOrder.paymentMethod === 'money' ? 0.7 : 1 }}
                                    />
                                </Stack>
                            </Stack>
                            {ticketServiceOrder.depositAmount > 0 && (
                                <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)' }}>Tiền cọc (Đã thu)</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-success-main)' }}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.depositAmount)}
                                    </Typography>
                                </Stack>
                            )}
                        </Card>

                        {/* Customer Card */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Khách hàng</Typography>
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <Avatar
                                    src={ticketServiceOrder.userId?.avatar}
                                    sx={{ width: 56, height: 56 }}
                                >
                                    <Icon icon="eva:person-fill" width={28} />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {ticketServiceOrder.userId?.fullName || "Khách vãng lai"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)', wordBreak: 'break-all' }}>
                                        {ticketServiceOrder.userId?.email || "Chưa có email"}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Card>

                        {/* TicketService Location Card (Mapped from Shipping Address) */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>Địa điểm phục vụ</Typography>
                            </Stack>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Địa chỉ</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {ticketServiceOrder.userId?.address || "Tại cửa hàng"}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', display: 'block' }}>Số điện thoại liên hệ</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                        {ticketServiceOrder.userId?.phone || "Chưa có số ĐT"}
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
