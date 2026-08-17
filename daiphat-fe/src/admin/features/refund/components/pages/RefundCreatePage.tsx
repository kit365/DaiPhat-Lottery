"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { prefixAdmin } from '@/admin/constants/routes';
import { handleOrderTicketIncidents, updateOrderStatus } from '@/admin/features/orders/services/orderService';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
} from '@/constants/ticketDisplay.constants';

/** Quick suggestions for staff refund reason (UI-only; not persisted separately). */
const STAFF_REFUND_REASON_SUGGESTIONS = [
    'Vé bị rách/hư hỏng không thể sử dụng',
    'Vé bị thất lạc trong quá trình chuẩn bị đơn',
    'Không còn vé thay thế phù hợp trong kho',
    'Khách hàng yêu cầu hoàn tiền theo chính sách',
] as const;

const InfoField = ({
    label,
    value,
    emphasize,
}: {
    label: string;
    value: React.ReactNode;
    emphasize?: boolean;
}) => {
    const empty = value == null || value === '';
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.75 }}
            >
                {label}
            </Typography>
            {typeof value === 'string' || typeof value === 'number' || empty ? (
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: emphasize ? 700 : 600,
                        color: emphasize
                            ? 'var(--palette-primary-main)'
                            : 'var(--palette-text-primary)',
                        wordBreak: 'break-word',
                    }}
                >
                    {empty ? '—' : value}
                </Typography>
            ) : (
                value
            )}
        </Box>
    );
};

const SectionCard = ({
    title,
    icon,
    children,
    action,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) => (
    <Card
        elevation={0}
        sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            border: '1px solid var(--palette-divider)',
            boxShadow: 'var(--customShadows-card)',
            overflow: 'hidden',
        }}
    >
        <CardHeader
            avatar={
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'var(--palette-primary-lighter)',
                        color: 'var(--palette-primary-dark)',
                    }}
                >
                    <Icon icon={icon} width={20} />
                </Avatar>
            }
            title={<Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>}
            action={action}
            sx={{
                px: 2.5,
                py: 1.75,
                bgcolor: 'var(--palette-background-neutral)',
                borderBottom: '1px solid var(--palette-divider)',
                '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' },
            }}
        />
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
);

export function RefundCreatePage() {
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const router = useAdminRouter();
    const state = {} as {
        orderId?: string;
        orderCode?: string;
        replacements?: Record<
            number,
            {
                faultedBy: 'DAMAGED' | 'LOST';
                damagedReason: string;
                damagedEvidenceUrl: string;
                newTicketId?: number;
            }
        >;
        orderDetails?: any[];
        orderInfo?: {
            customerName?: string;
            phone?: string;
            email?: string;
            statusLabel?: string;
            paymentStatusLabel?: string;
            createdAt?: string;
            totalAmount?: number;
            orderType?: string;
        };
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [selectedRefundReasonSuggestion, setSelectedRefundReasonSuggestion] = useState('');

    const tickets = useMemo(() => {
        if (!state?.orderDetails || !state?.replacements) return [];
        return state.orderDetails
            .filter((d: any) => state.replacements![d.id])
            .map((d: any) => {
                const ticket = d.lotteryTicket || d.ticket || {};
                const ticketSerial = d.ticketSerial || d.lotteryTicketSerial;
                return {
                    id: d.id,
                    numbers: d.numbers || ticket.numbers || d.serialNumber || '—',
                    serialNumber:
                        d.serialNumber || ticketSerial?.serialNumber || ticket.serialNumber || '—',
                    stationName: d.stationName || ticket.stationName || ticket.station?.name || '—',
                    drawDate: d.drawDate || ticket.drawDate,
                    ticketImg: ticketSerial?.ticketImg || ticket?.ticketImg,
                    lineSubtotal: d.lineSubtotal || d.price || ticket.price || 10000,
                    ...state.replacements![d.id],
                };
            });
    }, [state]);

    const refundTickets = useMemo(
        () => tickets.filter((t) => !t.newTicketId),
        [tickets]
    );

    const totalRefundAmount = useMemo(
        () =>
            refundTickets.reduce(
                (sum, t) => sum + (Number(t.lineSubtotal) || 10000),
                0
            ),
        [refundTickets]
    );

    if (!state || !state.orderId) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Dữ liệu không hợp lệ.</Typography>
                <Button onClick={() => router.back()} sx={{ mt: 2 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    const applyStaffRefundReasonSuggestion = (suggestion: string) => {
        setRefundReason(suggestion);
        setSelectedRefundReasonSuggestion(suggestion);
    };

    const handleSubmit = async () => {
        if (!state.replacements) return;
        const reason = refundReason.trim();
        if (!reason) {
            toast.error('Vui lòng nhập lý do hoàn tiền');
            return;
        }
        setIsSubmitting(true);
        try {
            const damagedIds = Object.keys(state.replacements)
                .filter((id) => state.replacements![Number(id)].faultedBy === 'DAMAGED')
                .map(Number);
            const lostIds = Object.keys(state.replacements)
                .filter((id) => state.replacements![Number(id)].faultedBy === 'LOST')
                .map(Number);

            if (damagedIds.length > 0) {
                await handleOrderTicketIncidents(state.orderId!, {
                    orderDetailIds: damagedIds,
                    reason: 'DAMAGED',
                    note: reason,
                });
            }

            if (lostIds.length > 0) {
                await handleOrderTicketIncidents(state.orderId!, {
                    orderDetailIds: lostIds,
                    reason: 'LOST',
                    note: reason,
                });
            }

            await updateOrderStatus(state.orderId!, 'PENDING_PICKUP', 'Xử lý sự cố hoàn tất');

            toast.success('Đã tạo yêu cầu hoàn tiền và cập nhật đơn hàng thành công');
            router.push(`/${prefixAdmin}/order/detail/${state.orderId}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu hoàn tiền');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <IconButton onClick={() => router.back()}>
                    <Icon icon="solar:arrow-left-linear" width={24} />
                </IconButton>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Tạo yêu cầu hoàn tiền
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Kiểm tra thông tin trước khi xác nhận tạo yêu cầu hoàn tiền.
                    </Typography>
                </Box>
            </Stack>

            <Stack spacing={2.5}>
                <SectionCard title="Thông tin đơn hàng" icon="solar:bill-list-bold-duotone">
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Mã đơn hàng"
                                value={state.orderCode || state.orderId}
                                emphasize
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Khách hàng"
                                value={state.orderInfo?.customerName || '—'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Số điện thoại"
                                value={
                                    state.orderInfo?.phone || state.orderInfo?.email || '—'
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Ngày đặt"
                                value={
                                    state.orderInfo?.createdAt
                                        ? dayjs(state.orderInfo.createdAt).format(
                                              'DD/MM/YYYY HH:mm'
                                          )
                                        : '—'
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Trạng thái đơn"
                                value={state.orderInfo?.statusLabel || '—'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Thanh toán"
                                value={state.orderInfo?.paymentStatusLabel || '—'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <InfoField
                                label="Tổng tiền đơn"
                                value={
                                    state.orderInfo?.totalAmount != null
                                        ? new Intl.NumberFormat('vi-VN', {
                                              style: 'currency',
                                              currency: 'VND',
                                          }).format(Number(state.orderInfo.totalAmount))
                                        : '—'
                                }
                            />
                        </Grid>
                    </Grid>
                </SectionCard>

                <SectionCard
                    title="Thông tin vé sự cố"
                    icon="solar:ticket-bold-duotone"
                    action={
                        <Chip size="small" label={`${tickets.length} vé`} sx={{ fontWeight: 700 }} />
                    }
                >
                    <TableContainer
                        sx={{
                            border: '1px solid var(--palette-divider)',
                            borderRadius: '12px',
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{TICKET_NUMBERS_LABEL}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Ngày xổ</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Lý do sự cố</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Vé thay thế</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Chi tiết</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tickets.map((t) => (
                                    <TableRow
                                        key={t.id}
                                        sx={{
                                            bgcolor: !t.newTicketId
                                                ? 'var(--palette-warning-lighter)'
                                                : 'transparent',
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            <Box>
                                                <AdminLuckyDisplay value={t.numbers} ticket />
                                                {t.serialNumber && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        component="div"
                                                        sx={{ mt: 0.25, lineHeight: 1.4, wordBreak: 'break-all' }}
                                                    >
                                                        {TICKET_SERIAL_PREFIX}: {t.serialNumber}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{t.stationName}</TableCell>
                                        <TableCell>
                                            {t.drawDate
                                                ? dayjs(t.drawDate).format('DD/MM/YYYY')
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={
                                                    t.faultedBy === 'LOST'
                                                        ? 'Vé bị thất lạc'
                                                        : 'Vé bị rách/hư hỏng'
                                                }
                                                sx={{
                                                    fontWeight: 700,
                                                    height: 24,
                                                    bgcolor:
                                                        t.faultedBy === 'LOST'
                                                            ? 'var(--palette-error-lighter)'
                                                            : 'var(--palette-warning-lighter)',
                                                    color:
                                                        t.faultedBy === 'LOST'
                                                            ? 'var(--palette-error-dark)'
                                                            : 'var(--palette-warning-dark)',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {t.newTicketId ? (
                                                <Chip
                                                    size="small"
                                                    color="success"
                                                    label={`#${t.newTicketId}`}
                                                    sx={{ fontWeight: 700, height: 22 }}
                                                />
                                            ) : (
                                                <Chip
                                                    size="small"
                                                    color="warning"
                                                    label="Hoàn tiền"
                                                    sx={{ fontWeight: 700, height: 22 }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {t.damagedReason || '—'}
                                            {t.damagedEvidenceUrl && (
                                                <Box sx={{ mt: 0.5 }}>
                                                    <a
                                                        href={t.damagedEvidenceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--palette-primary-main)',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Xem minh chứng
                                                    </a>
                                                </Box>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </SectionCard>

                <SectionCard title="Tóm tắt hoàn tiền" icon="solar:wallet-money-bold-duotone">
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2.5,
                                    borderRadius: '12px',
                                    bgcolor: 'var(--palette-warning-lighter)',
                                    border: '1px dashed var(--palette-warning-main)',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'var(--palette-warning-dark)',
                                        fontWeight: 700,
                                        display: 'block',
                                        mb: 0.75,
                                    }}
                                >
                                    Tổng tiền hoàn dự kiến
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 800, color: 'var(--palette-warning-dark)' }}
                                >
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                    }).format(totalRefundAmount)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Stack spacing={2}>
                                <InfoField
                                    label="Số vé cần hoàn"
                                    value={`${refundTickets.length} vé`}
                                />
                                <InfoField label="Loại hoàn tiền" value="Hoàn từng vé" />
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <InfoField
                                label="Tài khoản nhận hoàn"
                                value="Chưa có — khách sẽ cung cấp STK"
                            />
                        </Grid>
                    </Grid>
                </SectionCard>

                <SectionCard title="Chi tiết yêu cầu" icon="solar:document-text-bold-duotone">
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'var(--palette-text-disabled)',
                                display: 'block',
                                mb: 1,
                            }}
                        >
                            Lý do hoàn tiền *
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            value={refundReason}
                            onChange={(e) => {
                                const value = e.target.value.slice(0, 500);
                                setRefundReason(value);
                                if (selectedRefundReasonSuggestion && value !== selectedRefundReasonSuggestion) {
                                    setSelectedRefundReasonSuggestion('');
                                }
                            }}
                            placeholder="Nhập lý do tạo yêu cầu hoàn tiền..."
                            helperText="Bắt buộc trước khi tạo yêu cầu hoàn tiền."
                            disabled={isSubmitting}
                        />
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mt: 1.5, mb: 1 }}
                        >
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Gợi ý nhanh — chọn một lý do
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}
                            >
                                {refundReason.length}/500
                            </Typography>
                        </Stack>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {STAFF_REFUND_REASON_SUGGESTIONS.map((suggestion) => {
                                const isSelected = selectedRefundReasonSuggestion === suggestion;
                                return (
                                    <Chip
                                        key={suggestion}
                                        label={suggestion}
                                        size="small"
                                        onClick={() => applyStaffRefundReasonSuggestion(suggestion)}
                                        disabled={isSubmitting}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        color={isSelected ? 'warning' : 'default'}
                                        sx={{
                                            height: 'auto',
                                            py: 0.75,
                                            px: 0.5,
                                            borderRadius: '8px',
                                            fontWeight: isSelected ? 700 : 500,
                                            '& .MuiChip-label': {
                                                whiteSpace: 'normal',
                                                lineHeight: 1.35,
                                            },
                                            cursor: 'pointer',
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                </SectionCard>

                <Card
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 'var(--shape-borderRadius-lg)',
                        border: '1px solid var(--palette-divider)',
                        boxShadow: 'var(--customShadows-card)',
                    }}
                >
                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                        <Button
                            variant="outlined"
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleSubmit}
                            disabled={isSubmitting || tickets.length === 0 || !refundReason.trim()}
                            startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                boxShadow: 'none',
                            }}
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận & Tạo yêu cầu'}
                        </Button>
                    </Stack>
                </Card>
            </Stack>
        </Box>
    );
}
