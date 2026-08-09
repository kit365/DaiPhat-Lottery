"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Box, Typography, Chip, TablePagination, Collapse, Stack, Avatar, Divider, IconButton } from "@mui/material";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import { useQuery } from "@tanstack/react-query";
import { getBoardingTicketServiceOrders } from '../../../../api/boarding-booking.api';
import dayjs from "dayjs";
import { prefixAdmin } from '../../../../constants/routes';
import { useMemo, useState } from "react";
import { Icon } from '@/admin/components/ui/AdminIcon';

interface StaffBoardingHistoryProps {
    staffId: string;
}

const boardingStatusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
    held: { label: "Giữ chỗ", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
    confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
    "checked-in": { label: "Nhận chuồng", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
    "checked-out": { label: "Trả chuồng", color: "var(--palette-secondary-dark)", bg: "var(--palette-secondary-lighter)" },
    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
};

const BoardingRow = ({ ticketServiceOrder }: { ticketServiceOrder: any }) => {
    const router = useAdminRouter();
    const [open, setOpen] = useState(false);

    const status = boardingStatusMap[ticketServiceOrder.boardingStatus] || {
        label: ticketServiceOrder.boardingStatus,
        color: "var(--palette-text-disabled)",
        bg: "var(--palette-background-neutral)",
    };

    const nights = ticketServiceOrder.numberOfDays || dayjs(ticketServiceOrder.checkOutDate).diff(dayjs(ticketServiceOrder.checkInDate), "day") || 1;

    return (
        <>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "32px 160px 1fr 180px 130px 130px",
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
                    <Icon icon={open ? "eva:chevron-up-fill" : "eva:chevron-down-fill"} width={18} />
                </IconButton>

                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: "var(--palette-primary-main)",
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => router.push(`/${prefixAdmin}/boarding/detail/${ticketServiceOrder._id}`)}
                >
                    #{ticketServiceOrder.code || ticketServiceOrder._id?.slice(-6).toUpperCase()}
                </Typography>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {ticketServiceOrder.userTicketIds?.map((p: any) => p.name || "N/A").join(", ") || "N/A"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                        KH: {ticketServiceOrder.userId ? `${ticketServiceOrder.userId.lastName} ${ticketServiceOrder.userId.firstName}` : (ticketServiceOrder.fullName || "N/A")}
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="body2">
                        {dayjs(ticketServiceOrder.checkInDate).format("DD/MM/YYYY")} → {dayjs(ticketServiceOrder.checkOutDate).format("DD/MM/YYYY")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                        {nights} đêm · Chuồng {ticketServiceOrder.cageId?.cageCode || "N/A"}
                    </Typography>
                </Box>

                <Typography variant="subtitle2" textAlign="right" sx={{ fontWeight: 700 }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(ticketServiceOrder.total || 0)}
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

            {/* Dropdown detail */}
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
                        Vé người dùng lưu trú ({ticketServiceOrder.userTicketIds?.length || 0})
                    </Typography>

                    {(ticketServiceOrder.userTicketIds || []).length === 0 ? (
                        <Typography variant="caption" sx={{ fontStyle: "italic", color: "var(--palette-text-disabled)" }}>
                            Không có thú cưng.
                        </Typography>
                    ) : (
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            {(ticketServiceOrder.userTicketIds || []).map((userTicket: any, idx: number) => (
                                <Stack key={idx} direction="row" spacing={1} alignItems="center"
                                    sx={{ p: 1, borderRadius: "var(--shape-borderRadius)", bgcolor: "var(--palette-background-paper)", border: "1px solid var(--palette-divider)" }}
                                >
                                    <Avatar
                                        src={userTicket.avatar}
                                        sx={{ width: 32, height: 32, bgcolor: "var(--palette-primary-lighter)" }}
                                    >
                                        {userTicket.name?.charAt(0) || "P"}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{userTicket.name || "N/A"}</Typography>
                                        <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}>
                                            {userTicket.ticketSubtype || ""}{userTicket.weight ? ` · ${userTicket.weight}kg` : ""}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    )}

                    <Divider sx={{ mt: 2, mb: 1.5 }} />

                    <Stack direction="row" spacing={4} flexWrap="wrap">
                        <Box>
                            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 700 }}>Giá/đêm:</Typography>{" "}
                            <Typography variant="caption">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(ticketServiceOrder.pricePerDay || 0)}</Typography>
                        </Box>
                        {ticketServiceOrder.surcharge > 0 && (
                            <Box>
                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 700 }}>Phụ thu:</Typography>{" "}
                                <Typography variant="caption" sx={{ color: "var(--palette-warning-dark)" }}>
                                    +{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(ticketServiceOrder.surcharge)}
                                </Typography>
                                {ticketServiceOrder.surchargeReason && (
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-disabled)" }}> ({ticketServiceOrder.surchargeReason})</Typography>
                                )}
                            </Box>
                        )}
                        <Box>
                            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 700 }}>Thanh toán:</Typography>{" "}
                            <Typography variant="caption">
                                {{ unpaid: "Chưa TT", partial: "Đặt cọc", paid: "Đã TT", refunded: "Đã hoàn" }[ticketServiceOrder.paymentStatus as string] || ticketServiceOrder.paymentStatus}
                            </Typography>
                        </Box>
                        {ticketServiceOrder.specialCare && (
                            <Box>
                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", fontWeight: 700 }}>Chăm sóc đặc biệt:</Typography>{" "}
                                <Typography variant="caption">{ticketServiceOrder.specialCare}</Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </>
    );
};

export const StaffBoardingHistory = ({ staffId }: StaffBoardingHistoryProps) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data: res, isLoading } = useQuery({
        queryKey: ["staff-boarding-history", staffId, page, rowsPerPage],
        queryFn: () => getBoardingTicketServiceOrders({ staffId, page: page + 1, limit: rowsPerPage }),
        enabled: !!staffId,
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
        return <SpinnerLoading compact />;
    }

    if (ticketServiceOrders.length === 0) {
        return (
            <Box sx={{ p: 5, textAlign: "center", color: "var(--palette-text-disabled)" }}>
                <Icon icon="solar:home-2-bold" width={40} style={{ marginBottom: 8, opacity: 0.4 }} />
                <Typography variant="body2">Quản trị viên chưa có lịch boarding nào.</Typography>
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
                            gridTemplateColumns: "32px 160px 1fr 180px 130px 130px",
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
                        <Box>Vé người dùng / Khách hàng</Box>
                        <Box>Thời gian lưu trú</Box>
                        <Box textAlign="right">Tổng tiền</Box>
                        <Box textAlign="center">Trạng thái</Box>
                    </Box>

                    {ticketServiceOrders.map((ticketServiceOrder: any) => (
                        <BoardingRow key={ticketServiceOrder._id} ticketServiceOrder={ticketServiceOrder} />
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
