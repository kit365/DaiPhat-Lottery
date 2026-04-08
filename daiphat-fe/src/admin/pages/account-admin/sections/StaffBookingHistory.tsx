import { Box, Typography, CircularProgress, Chip, TablePagination, Collapse, Stack, Avatar, Divider, IconButton } from "@mui/material";
import { useTicketServiceOrders } from "../../ticket-service-order/hooks/useTicketServiceOrderManagement";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { prefixAdmin } from "../../../constants/routes";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";

interface StaffTicketServiceOrderHistoryProps {
    staffId: string;
}

const ticketServiceOrderStatusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
    delayed: { label: "Trễ hẹn", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    "in-progress": { label: "Đang thực hiện", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
    returned: { label: "Hoàn trả", color: "var(--palette-secondary-dark)", bg: "var(--palette-secondary-lighter)" },
};

const userTicketMapStatusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    "in-progress": { label: "Đang làm", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const TicketServiceOrderRow = ({ ticketServiceOrder, staffId }: { ticketServiceOrder: any; staffId: string }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    // Chỉ lấy thú cưng mà nhân viên này phụ trách
    const myUserTickets = useMemo(() => {
        return (ticketServiceOrder.userTicketStaffMap || []).filter(
            (m: any) => String(m.staffId?._id || m.staffId) === String(staffId)
        );
    }, [ticketServiceOrder, staffId]);

    const status = ticketServiceOrderStatusMap[ticketServiceOrder.ticketServiceOrderStatus] || {
        label: ticketServiceOrder.ticketServiceOrderStatus,
        color: "var(--palette-text-disabled)",
        bg: "var(--palette-background-neutral)",
    };

    return (
        <>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "32px 160px 1fr 150px 130px 130px",
                    px: 2,
                    py: 1.5,
                    borderBottom: "1px dashed var(--palette-divider)",
                    alignItems: "center",
                    "&:hover": { bgcolor: "var(--palette-action-hover)" },
                    transition: "background 0.15s",
                }}
            >
                <IconButton
                    size="small"
                    onClick={() => setOpen((o) => !o)}
                    sx={{ color: "var(--palette-text-secondary)" }}
                >
                    <Icon
                        icon={open ? "eva:chevron-up-fill" : "eva:chevron-down-fill"}
                        width={18}
                    />
                </IconButton>

                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: "var(--palette-primary-main)",
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/detail/${ticketServiceOrder._id}`)}
                >
                    #{ticketServiceOrder.code || ticketServiceOrder._id?.slice(-6).toUpperCase()}
                </Typography>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {ticketServiceOrder.ticketServiceId?.name || "Dịch vụ"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                        KH: {ticketServiceOrder.userId?.fullName || "N/A"}
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="body2">
                        {dayjs(ticketServiceOrder.start).format("DD/MM/YYYY")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                        {dayjs(ticketServiceOrder.start).format("HH:mm")} – {dayjs(ticketServiceOrder.end).format("HH:mm")}
                    </Typography>
                </Box>

                <Typography variant="subtitle2" textAlign="right" sx={{ fontWeight: 700 }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                        ticketServiceOrder.total || 0
                    )}
                </Typography>

                <Box textAlign="center">
                    <Chip
                        label={status.label}
                        size="small"
                        sx={{
                            borderRadius: "var(--shape-borderRadius-sm)",
                            fontWeight: 700,
                            fontSize: "0.6875rem",
                            color: status.color,
                            bgcolor: status.bg,
                            height: "24px",
                            "& .MuiChip-label": { px: "8px" },
                        }}
                    />
                </Box>
            </Box>

            {/* Dropdown detail: thú cưng phụ trách */}
            <Collapse in={open} unmountOnExit>
                <Box
                    sx={{
                        px: 4,
                        py: 2,
                        bgcolor: "var(--palette-background-neutral)",
                        borderBottom: "1px solid var(--palette-divider)",
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: "var(--palette-text-secondary)", mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    >
                        Vé người dùng phụ trách ({myUserTickets.length})
                    </Typography>

                    {myUserTickets.length === 0 ? (
                        <Typography variant="caption" sx={{ fontStyle: "italic", color: "var(--palette-text-disabled)" }}>
                            Không có thú cưng nào được gán cụ thể cho nhân viên này.
                        </Typography>
                    ) : (
                        <Stack spacing={1}>
                            {myUserTickets.map((m: any, idx: number) => {
                                const userTicketStatus = userTicketMapStatusMap[m.status] || {
                                    label: m.status || "N/A",
                                    color: "var(--palette-text-disabled)",
                                    bg: "var(--palette-background-neutral)",
                                };
                                return (
                                    <Stack key={idx} direction="row" spacing={2} alignItems="center">
                                        <Avatar
                                            src={m.userTicketId?.avatar}
                                            sx={{ width: 36, height: 36, bgcolor: "var(--palette-primary-lighter)" }}
                                        >
                                            {m.userTicketId?.name?.charAt(0) || "P"}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                {m.userTicketId?.name || "N/A"}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                                                {m.userTicketId?.ticketSubtype || ""}{m.userTicketId?.weight ? ` · ${m.userTicketId.weight}kg` : ""}
                                            </Typography>
                                        </Box>
                                        <Box textAlign="right">
                                            <Chip
                                                label={userTicketStatus.label}
                                                size="small"
                                                sx={{
                                                    borderRadius: "var(--shape-borderRadius-sm)",
                                                    fontWeight: 700,
                                                    fontSize: "0.6875rem",
                                                    color: userTicketStatus.color,
                                                    bgcolor: userTicketStatus.bg,
                                                    height: "22px",
                                                    "& .MuiChip-label": { px: "8px" },
                                                }}
                                            />
                                            {m.price != null && (
                                                <Typography variant="caption" sx={{ display: "block", color: "var(--palette-text-secondary)", mt: 0.3 }}>
                                                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(m.price)}
                                                </Typography>
                                            )}
                                        </Box>
                                        {m.startedAt && (
                                            <Box textAlign="right" sx={{ minWidth: 100 }}>
                                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", display: "block" }}>
                                                    Bắt đầu: {dayjs(m.startedAt).format("HH:mm DD/MM")}
                                                </Typography>
                                                {m.completedAt && (
                                                    <Typography variant="caption" sx={{ color: "var(--palette-success-dark)", display: "block" }}>
                                                        Xong: {dayjs(m.completedAt).format("HH:mm DD/MM")}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}

                    <Divider sx={{ mt: 2, mb: 1.5 }} />
                    <Stack direction="row" spacing={3}>
                        {ticketServiceOrder.notes && (
                            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                                <b>Ghi chú:</b> {ticketServiceOrder.notes}
                            </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                            <b>Thanh toán:</b>{" "}
                            {{ unpaid: "Chưa TT", partially_paid: "Đặt cọc", paid: "Đã TT", refunded: "Đã hoàn" }[ticketServiceOrder.paymentStatus as string] || ticketServiceOrder.paymentStatus}
                        </Typography>
                    </Stack>
                </Box>
            </Collapse>
        </>
    );
};

export const StaffTicketServiceOrderHistory = ({ staffId }: StaffTicketServiceOrderHistoryProps) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data: res, isLoading } = useTicketServiceOrders({
        staffId,
        page: page + 1,
        limit: rowsPerPage,
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

    const pagination = (res as any)?.data?.pagination || { totalRecords: 0 };

    if (isLoading) {
        return (
            <Box sx={{ p: 5, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (ticketServiceOrders.length === 0) {
        return (
            <Box sx={{ p: 5, textAlign: "center", color: "var(--palette-text-disabled)" }}>
                <Icon icon="solar:calendar-search-bold" width={40} style={{ marginBottom: 8, opacity: 0.4 }} />
                <Typography variant="body2">Nhân viên chưa có lịch dịch vụ nào.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ minWidth: 820 }}>
                    {/* Header */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "32px 160px 1fr 150px 130px 130px",
                            px: 2,
                            py: 1.5,
                            bgcolor: "var(--palette-background-neutral)",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            color: "var(--palette-text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                    >
                        <Box />
                        <Box>Mã đơn</Box>
                        <Box>Dịch vụ / Khách hàng</Box>
                        <Box>Thời gian</Box>
                        <Box textAlign="right">Tổng tiền</Box>
                        <Box textAlign="center">Trạng thái</Box>
                    </Box>

                    {ticketServiceOrders.map((ticketServiceOrder: any) => (
                        <TicketServiceOrderRow key={ticketServiceOrder._id} ticketServiceOrder={ticketServiceOrder} staffId={staffId} />
                    ))}
                </Box>
            </Box>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={pagination.totalRecords || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage="Số lượng:"
                sx={{
                    "& .MuiTablePagination-selectLabel": { mb: 0 },
                    "& .MuiTablePagination-input": { mt: 0, mb: 0 },
                    "& .MuiTablePagination-actions": { mt: 0, mb: 0 },
                    "& .MuiTablePagination-toolbar": { minHeight: 48, p: 0, pr: 1 },
                }}
            />
        </Box>
    );
};
