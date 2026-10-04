"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
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
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { prefixAdmin } from '@/admin/constants/routes';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { useOrderDetail } from '@/admin/features/orders/hooks/useOrder';
import { useCancelOrderWithRefund } from '@/admin/features/refund/hooks/useRefundManagement';
import {
    OrderStatus,
    getOrderDetailStatusAdminBadgeModifier,
    resolveOrderDetailStatusBadge,
} from '@/types/order.type';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { formatKpiAmount, formatVnd } from '@/admin/utils/currency';
import {
    getOrderStatusBadge,
    getOrderStatusAdminBadgeModifier,
} from '@/shared/components/StatusBadge/orderStatusMap';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
} from '@/constants/ticketDisplay.constants';
import {
    ORDER_CANCEL_REASON_DEFAULTS,
    calculateOrderRefundAmount,
    type StaffCancelOrderWithRefundRequest,
} from '@/types/refund.type';
import type { IncidentTicketDisplay } from '@/admin/features/orders/types/incidentTicket.type';
import { resolveOrderDetailTicketDisplay } from '@/admin/features/orders/utils/resolveOrderDetailTicketDisplay';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';

type StaffCancelType = StaffCancelOrderWithRefundRequest['cancelType'];

type TicketIncidentState = {
    faultedBy: 'DAMAGED' | 'LOST' | '';
    damagedReason: string;
    damagedEvidenceUrl: string;
    damagedEvidenceFiles?: any[];
};

const QUICK_INCIDENT_REASONS: Record<string, string[]> = {
    DAMAGED: [
        'Vé bị rách / mất góc',
        'Mờ số / không đọc được mã',
        'Vé bị ướt / dính bẩn / phai màu',
        'Lỗi in ấn / vé biến dạng',
    ],
    LOST: [
        'Không tìm thấy vé trong tập lưu trữ',
        'Thất lạc sau khi bàn giao ca trực',
        'Thiếu vé từ khâu nhận bàn giao đại lý',
        'Vé bị thất lạc chưa rõ nguyên nhân',
    ],
};

const CANCEL_TYPE_OPTIONS: {
    value: StaffCancelType;
    title: string;
    description: string;
    incidentOnly?: boolean;
}[] = [
    {
        value: 'ADMIN_FORCE_CANCEL',
        title: 'Hủy hộ khách hàng',
        description:
            'Dùng khi khách yêu cầu nhân viên hủy đơn. Hệ thống sẽ tạo yêu cầu hoàn toàn bộ tiền đơn.',
    },
    {
        value: 'OUT_OF_STOCK_INCIDENT',
        title: 'Sự cố kho - Hủy toàn bộ đơn',
        description:
            'Dùng khi tất cả vé trong đơn bị hư hỏng hoặc thất lạc và không còn vé thay thế. Cần ghi nhận sự cố cho từng vé.',
        incidentOnly: true,
    },
];

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
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
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
            sx={{
                px: 2.5,
                py: 1.75,
                bgcolor: 'var(--palette-background-neutral)',
                borderBottom: '1px solid var(--palette-divider)',
            }}
        />
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
);

export function OrderCancelWithRefundPage() {
    const { id: orderId } = useRouteParams();
    const router = useAdminRouter();
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const [cancelType, setCancelType] = useState<StaffCancelType | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [incidents, setIncidents] = useState<Record<number, TicketIncidentState>>({});
    const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);
    const [navigationState, setNavigationState] = useState<{
        cancelType?: StaffCancelType;
        replacements?: Record<
            number,
            {
                faultedBy: 'DAMAGED' | 'LOST';
                damagedReason?: string;
                damagedEvidenceUrl?: string;
            }
        >;
    } | null>(null);

    const [uploadingTicketIds, setUploadingTicketIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("daiphat:order-cancel-refund-state");
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                cancelType?: StaffCancelType;
                replacements?: Record<
                    number,
                    {
                        faultedBy: 'DAMAGED' | 'LOST';
                        damagedReason?: string;
                        damagedEvidenceUrl?: string;
                    }
                >;
            };
            sessionStorage.removeItem("daiphat:order-cancel-refund-state");
            setNavigationState(parsed);
            if (parsed.cancelType) {
                setCancelType(parsed.cancelType);
            }
        } catch {
            // ignore malformed navigation payload
        }
    }, []);

    const { data: orderRes, isLoading } = useOrderDetail(orderId || '');
    const order = orderRes?.data;
    const cancelMutation = useCancelOrderWithRefund();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const canReportStockIncident = order?.status === OrderStatus.PAID
        || order?.status === OrderStatus.PREPARING
        || order?.status === OrderStatus.PENDING_PICKUP;
    const canCancelForCustomer = !!order?.preparationCutoffAt
        && dayjs(order.preparationCutoffAt).isValid()
        && now < dayjs(order.preparationCutoffAt).valueOf()
        && [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP].includes(order.status as OrderStatus);
    useEffect(() => {
        if (!order) return;
        if ((cancelType === 'ADMIN_FORCE_CANCEL' && !canCancelForCustomer)
            || (cancelType === 'OUT_OF_STOCK_INCIDENT' && !canReportStockIncident)) {
            setCancelType(null);
        }
    }, [order, cancelType, canCancelForCustomer, canReportStockIncident]);

    const tickets = useMemo(() => {
        if (!order?.orderDetails || !Array.isArray(order.orderDetails)) return [];
        return (order.orderDetails as any[])
            .map((d, index) => {
                const display = resolveOrderDetailTicketDisplay(d);
                return {
                    ...display,
                    id: display.id ?? d.id ?? d.ticketId ?? (index + 1),
                    lineSubtotal: Number(d.lineSubtotal ?? d.price ?? display.price ?? 10000),
                    raw: d,
                };
            })
            .filter((t) => t.id != null && ['ACTIVE', 'PROXY_HOLDING', 'HANDOVER_IN_PROGRESS'].includes(t.status || ''));
    }, [order]);

    const refundAmount = useMemo(
        () => (order ? calculateOrderRefundAmount(order as any) : 0),
        [order]
    );

    useEffect(() => {
        if (!cancelType) return;
        setCancelReason(ORDER_CANCEL_REASON_DEFAULTS[cancelType]);
    }, [cancelType]);

    useEffect(() => {
        if (!navigationState?.replacements || tickets.length === 0) return;
        const next: Record<number, TicketIncidentState> = {};
        for (const t of tickets) {
            const prefill = navigationState.replacements[t.id!];
            if (prefill?.faultedBy) {
                next[t.id!] = {
                    faultedBy: prefill.faultedBy,
                    damagedReason: prefill.damagedReason || '',
                    damagedEvidenceUrl: prefill.damagedEvidenceUrl || '',
                    damagedEvidenceFiles: prefill.damagedEvidenceUrl
                        ? [prefill.damagedEvidenceUrl]
                        : [],
                };
            }
        }
        if (Object.keys(next).length > 0) {
            setIncidents(next);
        }
    }, [navigationState?.replacements, tickets]);

    const updateIncident = (ticketId: number, patch: Partial<TicketIncidentState>) => {
        const defaultIncident = {
            faultedBy: '',
            damagedReason: '',
            damagedEvidenceUrl: '',
            damagedEvidenceFiles: [],
        };
        setIncidents((prev) => ({
            ...prev,
            [ticketId]: {
                ...defaultIncident,
                ...prev[ticketId],
                ...patch,
            },
        }));
    };

    const handleIncidentClick = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        if (expandedTicketId === ticketId) {
            setExpandedTicketId(null);
        } else {
            setExpandedTicketId(ticketId);
            if (!incidents[ticketId]) {
                setIncidents((prev) => ({
                    ...prev,
                    [ticketId]: {
                        faultedBy: '',
                        damagedReason: '',
                        damagedEvidenceUrl: '',
                        damagedEvidenceFiles: [],
                    },
                }));
            }
        }
    };

    const handleCancelIncident = (ticketId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setIncidents((prev) => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
        setUploadingTicketIds((prev) => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
        if (expandedTicketId === ticketId) {
            setExpandedTicketId(null);
        }
    };

        const renderIncidentForm = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        const state = incidents[ticketId];
        if (!state) return null;

        return (
            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, borderBottom: 'none' }}>
                    <Collapse in={expandedTicketId === ticketId} timeout="auto" unmountOnExit>
                        <Box
                            sx={{
                                p: { xs: 2, md: 2.5 },
                                bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                borderRadius: '0 0 12px 12px',
                                mb: 2,
                                border: '1px solid var(--palette-divider)',
                                borderTop: 'none',
                            }}
                        >
                            <Stack spacing={2.5} sx={{ width: '100%' }}>
                                {/* Header: Ghi nhận sự cố vé số */}
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                        justifyContent="space-between"
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: 'var(--palette-warning-lighter, #fff7ed)',
                                                    color: 'var(--palette-warning-dark, #c2410c)',
                                                    border: '1px solid var(--palette-warning-light, #fed7aa)',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Icon icon="solar:ticket-bold-duotone" width={22} />
                                            </Box>
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}
                                                    >
                                                        Ghi nhận sự cố vé số
                                                    </Typography>
                                                    <AdminLuckyDisplay
                                                        value={ticket.numbers}
                                                        ticket
                                                        component="span"
                                                        fontSize="1rem"
                                                        fontWeight={800}
                                                    />
                                                </Stack>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '0.8125rem', mt: 0.25 }}
                                                >
                                                    Xác định tình trạng thực tế và cung cấp thông tin đối soát cho vé số này.
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                            {ticket.serialNumber && (
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`Sê-ri: ${ticket.serialNumber}`}
                                                    sx={{
                                                        height: 26,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        fontFamily: 'monospace',
                                                        bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                                    }}
                                                />
                                            )}
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={`Đài: ${ticket.stationName || '—'}`}
                                                sx={{
                                                    height: 26,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                                }}
                                            />
                                            {ticket.drawDate && (
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`Xổ: ${dayjs(ticket.drawDate).format('DD/MM/YYYY')}`}
                                                    sx={{
                                                        height: 26,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    </Stack>
                                </Box>

                                {/* 1. Phân loại sự cố vé */}
                                <Box sx={{ width: '100%' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.875rem' }}>
                                        1. Phân loại sự cố vé <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
                                        Chọn đúng tình trạng thực tế của vé số trong kho.
                                    </Typography>
                                    <ToggleButtonGroup
                                        color="primary"
                                        value={state.faultedBy || null}
                                        exclusive
                                        onChange={(_, value) => {
                                            if (value !== null) {
                                                updateIncident(ticketId, {
                                                    faultedBy: value,
                                                    ...(value !== state.faultedBy ? { damagedReason: '' } : {}),
                                                    ...(value === 'LOST'
                                                        ? {
                                                              damagedEvidenceUrl: '',
                                                              damagedEvidenceFiles: [],
                                                          }
                                                        : {}),
                                                });
                                            }
                                        }}
                                        sx={{
                                            width: '100%',
                                            display: 'flex',
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            gap: 1.5,
                                            bgcolor: 'transparent',
                                            '& .MuiToggleButtonGroup-grouped': {
                                                border: '1px solid var(--palette-divider) !important',
                                                borderRadius: '10px !important',
                                                mx: 0,
                                            },
                                            '& .MuiToggleButton-root': {
                                                flex: 1,
                                                textTransform: 'none',
                                                minHeight: 64,
                                                py: 1.25,
                                                px: 2,
                                                color: 'text.secondary',
                                                bgcolor: 'background.paper',
                                                transition: 'all 0.15s ease-in-out',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                    borderColor: 'primary.light !important',
                                                },
                                                '&.Mui-selected': {
                                                    color: 'error.dark',
                                                    bgcolor: 'error.lighter',
                                                    borderColor: 'error.light !important',
                                                    boxShadow: '0 0 0 1px var(--palette-error-main, #ef4444)',
                                                },
                                            },
                                        }}
                                    >
                                        <ToggleButton value="DAMAGED">
                                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', textAlign: 'left', minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '8px',
                                                        bgcolor: state.faultedBy === 'DAMAGED' ? 'error.light' : 'action.selected',
                                                        color: state.faultedBy === 'DAMAGED' ? '#fff' : 'text.secondary',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Icon icon="solar:ticket-bold-duotone" width={22} />
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3 }}>
                                                        Vé hư hỏng
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, lineHeight: 1.35, wordBreak: 'break-word' }}>
                                                        Vé bị rách, ướt, mờ số, mất góc hoặc không còn nguyên vẹn
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </ToggleButton>
                                        <ToggleButton value="LOST">
                                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', textAlign: 'left', minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '8px',
                                                        bgcolor: state.faultedBy === 'LOST' ? 'error.light' : 'action.selected',
                                                        color: state.faultedBy === 'LOST' ? '#fff' : 'text.secondary',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Icon icon="solar:box-minimalistic-bold-duotone" width={22} />
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3 }}>
                                                        Vé thất lạc / Thiếu vé
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, lineHeight: 1.35, wordBreak: 'break-word' }}>
                                                        Không tìm thấy vé trong kho sau khi đã kiểm tra kỹ lưỡng
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>

                                {/* 2. Mô tả chi tiết sự cố & 3. Ảnh chụp minh chứng */}
                                {state.faultedBy === 'LOST' && (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            p: { xs: 2, md: 2.5 },
                                            borderRadius: '12px',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.875rem' }}
                                                >
                                                    2. Mô tả chi tiết sự cố <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
                                                    Ghi rõ các khu vực đã kiểm tra (tủ vé, khay lưu trữ, biên bản giao nhận) và hoàn cảnh phát hiện thất lạc.
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    multiline
                                                    minRows={3}
                                                    value={state.damagedReason}
                                                    onChange={(e) =>
                                                        updateIncident(ticketId, {
                                                            damagedReason: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Ví dụ: Đã kiểm tra toàn bộ xấp vé lưu trữ và khu vực bàn giao ca trực nhưng không tìm thấy vé số này..."
                                                    inputProps={{ 'aria-label': 'Mô tả sự cố của vé' }}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            bgcolor: 'background.paper',
                                                            fontSize: '0.875rem',
                                                        },
                                                    }}
                                                />
                                            </Box>

                                            {QUICK_INCIDENT_REASONS.LOST && (
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: 'text.secondary',
                                                            display: 'block',
                                                            mb: 1,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Chọn nhanh lý do gợi ý:
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 1,
                                                        }}
                                                    >
                                                        {QUICK_INCIDENT_REASONS.LOST.map((reason) => {
                                                            const isSelected = state.damagedReason === reason;
                                                            return (
                                                                <Button
                                                                    key={reason}
                                                                    size="small"
                                                                    onClick={() =>
                                                                        updateIncident(ticketId, {
                                                                            damagedReason: reason,
                                                                        })
                                                                    }
                                                                    sx={{
                                                                        px: 1.5,
                                                                        py: 0.6,
                                                                        bgcolor: isSelected ? 'error.lighter' : 'var(--palette-grey-100, #f8fafc)',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid',
                                                                        borderColor: isSelected ? 'error.light' : 'divider',
                                                                        color: isSelected ? 'error.dark' : 'text.primary',
                                                                        textTransform: 'none',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: isSelected ? 700 : 500,
                                                                        textAlign: 'left',
                                                                        lineHeight: 1.35,
                                                                        '&:hover': {
                                                                            bgcolor: isSelected ? 'error.lighter' : 'action.hover',
                                                                            borderColor: isSelected ? 'error.main' : 'text.disabled',
                                                                        },
                                                                    }}
                                                                >
                                                                    {reason}
                                                                </Button>
                                                            );
                                                        })}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>
                                )}

                                {state.faultedBy === 'DAMAGED' && (
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                        sx={{ width: '100%', alignItems: 'stretch' }}
                                    >
                                        {/* Cột 1: Mô tả sự cố */}
                                        <Box
                                            sx={{
                                                flex: { xs: '1 1 auto', md: '1 1 55%' },
                                                p: { xs: 2, md: 2.5 },
                                                borderRadius: '12px',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Stack spacing={2}>
                                                <Box>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.875rem' }}
                                                    >
                                                        2. Mô tả chi tiết sự cố <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
                                                        Ghi rõ vị trí rách, phần thông tin bị mờ hoặc nguyên nhân hư hại để đối chiếu.
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        minRows={4}
                                                        value={state.damagedReason}
                                                        onChange={(e) =>
                                                            updateIncident(ticketId, {
                                                                damagedReason: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Ví dụ: Vé bị rách góc trên bên phải làm mờ một phần mã kiểm tra, các chữ số trúng thưởng vẫn nhìn rõ..."
                                                        inputProps={{ 'aria-label': 'Mô tả sự cố của vé' }}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                bgcolor: 'background.paper',
                                                                fontSize: '0.875rem',
                                                            },
                                                        }}
                                                    />
                                                </Box>

                                                {QUICK_INCIDENT_REASONS.DAMAGED && (
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: 'text.secondary',
                                                                display: 'block',
                                                                mb: 1,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            Chọn nhanh lý do gợi ý:
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            {QUICK_INCIDENT_REASONS.DAMAGED.map((reason) => {
                                                                const isSelected = state.damagedReason === reason;
                                                                return (
                                                                    <Button
                                                                        key={reason}
                                                                        size="small"
                                                                        onClick={() =>
                                                                            updateIncident(ticketId, {
                                                                                damagedReason: reason,
                                                                            })
                                                                        }
                                                                        sx={{
                                                                            px: 1.25,
                                                                            py: 0.5,
                                                                            bgcolor: isSelected ? 'error.lighter' : 'var(--palette-grey-100, #f8fafc)',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid',
                                                                            borderColor: isSelected ? 'error.light' : 'divider',
                                                                            color: isSelected ? 'error.dark' : 'text.primary',
                                                                            textTransform: 'none',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: isSelected ? 700 : 500,
                                                                            textAlign: 'left',
                                                                            lineHeight: 1.35,
                                                                            '&:hover': {
                                                                                bgcolor: isSelected ? 'error.lighter' : 'action.hover',
                                                                                borderColor: isSelected ? 'error.main' : 'text.disabled',
                                                                            },
                                                                        }}
                                                                    >
                                                                        {reason}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>

                                        {/* Cột 2: Ảnh chụp minh chứng */}
                                        <Box
                                            sx={{
                                                flex: { xs: '1 1 auto', md: '1 1 45%' },
                                                p: { xs: 2, md: 2.5 },
                                                borderRadius: '12px',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <Box sx={{ mb: 1.5 }}>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 0.5 }}
                                                >
                                                    3. Ảnh chụp minh chứng <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: '0.8125rem',
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    Tải lên ảnh chụp rõ tình trạng thực tế của vé (thấy rõ dãy số và phần bị hư hỏng).
                                                </Typography>
                                            </Box>

                                            <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <UploadSingleFile
                                                    value={state.damagedEvidenceUrl || null}
                                                    onChange={(fileOrUrl) => {
                                                        const urlStr = typeof fileOrUrl === 'string' ? fileOrUrl : '';
                                                        updateIncident(ticketId, {
                                                            damagedEvidenceUrl: urlStr,
                                                            damagedEvidenceFiles: urlStr ? [urlStr] : (fileOrUrl instanceof File ? [fileOrUrl] : []),
                                                        });
                                                    }}
                                                    onUploadingChange={(uploading) => {
                                                        setUploadingTicketIds((prev) => ({ ...prev, [ticketId]: uploading }));
                                                    }}
                                                    autoUpload={true}
                                                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                                                    maxFileSizeMb={10}
                                                    helperText="Hỗ trợ ảnh JPG, PNG, WEBP (tối đa 10MB)"
                                                />
                                            </Box>
                                        </Box>
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        );
    };


    const allIncidentsValid = useMemo(() => {
        if (tickets.length === 0) return false;
        return tickets.every((t) => {
            const state = incidents[t.id!];
            if (!state?.faultedBy || !state.damagedReason.trim()) return false;
            if (state.faultedBy === 'DAMAGED') {
                if (!state.damagedEvidenceUrl) return false;
                const hasUnuploaded = (state.damagedEvidenceFiles || []).some(
                    (f: any) => f instanceof File
                );
                if (hasUnuploaded) return false;
            }
            return true;
        });
    }, [tickets, incidents]);

    const isAnyImageUploading = useMemo(
        () => Object.values(uploadingTicketIds).some(Boolean),
        [uploadingTicketIds]
    );

    const completedIncidentCount = useMemo(() => tickets.filter((ticket) => {
        const incident = incidents[ticket.id!];
        if (!incident?.faultedBy || !incident.damagedReason.trim()) return false;
        return incident.faultedBy === 'LOST' || (
            !!incident.damagedEvidenceUrl &&
            !(incident.damagedEvidenceFiles || []).some((file: any) => file instanceof File)
        );
    }).length, [tickets, incidents]);

    const canSubmit = useMemo(() => {
        if (!cancelType || !cancelReason.trim() || cancelMutation.isPending || isAnyImageUploading) return false;
        if (cancelType === 'OUT_OF_STOCK_INCIDENT') {
            return canReportStockIncident && allIncidentsValid;
        }
        return canCancelForCustomer;
    }, [cancelType, cancelReason, cancelMutation.isPending, isAnyImageUploading, allIncidentsValid, canReportStockIncident, canCancelForCustomer]);

    const handleSelectType = (type: StaffCancelType) => {
        if (type === 'OUT_OF_STOCK_INCIDENT' && !canReportStockIncident) {
            toast.error('Hủy do sự cố kho chỉ áp dụng khi đơn đã thanh toán, đang chuẩn bị hoặc chờ nhận vé.');
            return;
        }
        if (type === 'ADMIN_FORCE_CANCEL' && !canCancelForCustomer) return;
        setCancelType(type);
    };

    const handleSubmit = () => {
        if (!order || !cancelType || !canSubmit) return;

        const payload: StaffCancelOrderWithRefundRequest = {
            cancelType,
            cancelReason: cancelReason.trim(),
        };

        if (cancelType === 'OUT_OF_STOCK_INCIDENT') {
            payload.incidents = tickets.map((t) => {
                const state = incidents[t.id!];
                return {
                    orderDetailId: t.id!,
                    reason: state.faultedBy as 'DAMAGED' | 'LOST',
                    damagedReason: state.damagedReason.trim(),
                    damagedEvidenceUrl: state.damagedEvidenceUrl || undefined,
                };
            });
        }

        cancelMutation.mutate(
            { orderId: order.id, ...payload },
            {
                onSuccess: (res) => {
                    if (res.success && res.data?.id) {
                        router.push(`/${prefixAdmin}/refunds/detail/${res.data.id}`);
                    } else {
                        router.push(`/${prefixAdmin}/order/detail/${order.id}`);
                    }
                },
            }
        );
    };

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 4 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <IconButton onClick={() => router.back()}>
                        <Icon icon="solar:arrow-left-linear" width={24} />
                    </IconButton>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Báo lỗi & Hủy đơn
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Chọn lý do hủy, kiểm tra vé và xác nhận yêu cầu hoàn tiền cho khách.
                        </Typography>
                    </Box>
                </Stack>
                <SpinnerLoading />
            </Box>
        );
    }

    if (!order || !orderId) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography>Không tìm thấy đơn hàng</Typography>
                <Button onClick={() => router.back()} sx={{ mt: 2 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as OrderStatus)) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography>
                    Không thể báo lỗi & hủy đơn đã hoàn thành hoặc đã hủy.
                </Typography>
                <Button
                    onClick={() => router.push(`/${prefixAdmin}/order/detail/${order.id}`)}
                    sx={{ mt: 2 }}
                >
                    Về chi tiết đơn
                </Button>
            </Box>
        );
    }

    const visibleTypeOptions = CANCEL_TYPE_OPTIONS.filter(
        (opt) => opt.incidentOnly ? canReportStockIncident : canCancelForCustomer
    );

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <IconButton onClick={() => router.push(`/${prefixAdmin}/order/detail/${order.id}`)}>
                    <Icon icon="solar:arrow-left-linear" width={24} />
                </IconButton>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Báo lỗi & Hủy đơn
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Chọn lý do hủy, kiểm tra vé và xác nhận yêu cầu hoàn tiền cho khách.
                    </Typography>
                </Box>
            </Stack>

            <Stack spacing={2.5}>
                <SectionCard title="Bước 1 — Chọn lý do hủy đơn" icon="solar:checklist-bold-duotone">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Chọn trường hợp phù hợp. Nếu vé gặp sự cố, bạn cần báo lỗi cho từng vé trước khi xác nhận hủy đơn.
                    </Typography>
                    <Grid container spacing={2}>
                        {visibleTypeOptions.map((opt) => {
                            const selected = cancelType === opt.value;
                            return (
                                <Grid key={opt.value} size={{ xs: 12, md: 6 }}>
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => handleSelectType(opt.value)}
                                        sx={{
                                            p: 2.25,
                                            height: '100%',
                                            width: '100%',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            font: 'inherit',
                                            border: selected
                                                ? '2px solid var(--palette-warning-main)'
                                                : '1px solid var(--palette-divider)',
                                            bgcolor: selected
                                                ? 'var(--palette-warning-lighter)'
                                                : 'var(--palette-background-paper)',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                borderColor: 'var(--palette-warning-main)',
                                            },
                                            '&:focus-visible': { outline: '3px solid var(--palette-warning-main)', outlineOffset: 2 },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                                            <Typography sx={{ fontWeight: 700 }}>{opt.title}</Typography>
                                            <Icon icon={selected ? 'solar:check-circle-bold' : 'solar:circle-linear'} width={22} color={selected ? 'var(--palette-warning-dark)' : 'var(--palette-text-disabled)'} />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                            {opt.description}
                                        </Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </SectionCard>

                <Collapse in={!!cancelType} unmountOnExit>
                    <Stack spacing={2.5}>
                        <SectionCard title="Thông tin đơn hàng" icon="solar:bill-list-bold-duotone">
                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField label="Mã đơn hàng" value={order.orderCode} emphasize />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Khách hàng"
                                        value={order.name || '—'}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField label="Số điện thoại" value={order.phone || '—'} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Ngày đặt"
                                        value={
                                            order.createdAt
                                                ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')
                                                : '—'
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Trạng thái"
                                        value={
                                            <AdminStatusBadge
                                                label={getOrderStatusBadge(order.status).label}
                                                modifier={getOrderStatusAdminBadgeModifier(order.status)}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Tổng tiền đơn"
                                        value={new Intl.NumberFormat('vi-VN', {
                                            style: 'currency',
                                            currency: 'VND',
                                        }).format(Number(order.totalAmount) || 0)}
                                    />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        <SectionCard title="Bước 2 — Kiểm tra vé trong đơn" icon="solar:ticket-bold-duotone">
                            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {cancelType === 'OUT_OF_STOCK_INCIDENT'
                                        ? `Báo lỗi cho từng vé trong ${tickets.length} vé dưới đây. Mỗi vé cần chọn phân loại sự cố và mô tả chi tiết; vé hư hỏng cần tải lên ảnh minh chứng.`
                                        : `Kiểm tra danh sách ${tickets.length} vé thuộc đơn hàng trước khi xác nhận hủy đơn.`}
                                </Typography>
                                {cancelType === 'OUT_OF_STOCK_INCIDENT' && (
                                    <Chip
                                        size="small"
                                        label={`Đã hoàn tất ${completedIncidentCount}/${tickets.length} vé`}
                                        color={completedIncidentCount === tickets.length && tickets.length > 0 ? 'success' : 'warning'}
                                        variant={completedIncidentCount === tickets.length && tickets.length > 0 ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                    />
                                )}
                            </Stack>
                            <TableContainer
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'var(--palette-divider)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                }}
                            >
                                <Table
                                    size="small"
                                    sx={{
                                        '& .MuiTableCell-root': {
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            py: 1.5,
                                        },
                                    }}
                                >
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontWeight: 600,
                                                    borderBottom: 'none',
                                                }}
                                            >
                                                Vé số
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontWeight: 600,
                                                    borderBottom: 'none',
                                                }}
                                            >
                                                Đài xổ
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontWeight: 600,
                                                    borderBottom: 'none',
                                                }}
                                            >
                                                Ngày xổ
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontWeight: 600,
                                                    borderBottom: 'none',
                                                }}
                                            >
                                                Mệnh giá
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontWeight: 600,
                                                    borderBottom: 'none',
                                                }}
                                            >
                                                Trạng thái
                                            </TableCell>
                                            {cancelType === 'OUT_OF_STOCK_INCIDENT' && (
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        color: 'var(--palette-text-secondary)',
                                                        fontWeight: 600,
                                                        borderBottom: 'none',
                                                    }}
                                                >
                                                    Thao tác
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tickets.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={
                                                        cancelType === 'OUT_OF_STOCK_INCIDENT' ? 6 : 5
                                                    }
                                                    align="center"
                                                    sx={{ py: 4 }}
                                                >
                                                    <Typography variant="body2" color="text.secondary">
                                                        Không có vé trong đơn
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {tickets.map((ticket) => {
                                            const state =
                                                ticket.id != null ? incidents[ticket.id] : undefined;
                                            const isReporting =
                                                ticket.id != null && expandedTicketId === ticket.id;
                                            const hasStartedFilling = !!state?.faultedBy;
                                            const activityBadge = resolveOrderDetailStatusBadge(
                                                ticket.status,
                                                ticket.statusDisplayName
                                            );

                                            return (
                                                <React.Fragment key={ticket.id}>
                                                    <TableRow
                                                        hover
                                                        sx={{
                                                            '&:last-child td, &:last-child th': {
                                                                border: 0,
                                                            },
                                                        }}
                                                    >
                                                        <TableCell align="center">
                                                            <Box sx={{ textAlign: 'center' }}>
                                                                <AdminLuckyDisplay
                                                                    value={ticket.numbers}
                                                                    ticket
                                                                    fontSize="0.875rem"
                                                                    fontWeight={700}
                                                                    letterSpacing="0.06em"
                                                                    sx={{ color: 'var(--palette-text-primary)' }}
                                                                />
                                                                {ticket.serialNumber && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        component="div"
                                                                        sx={{ mt: 0.25, lineHeight: 1.4, wordBreak: 'break-all' }}
                                                                    >
                                                                        SN: {ticket.serialNumber}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    color: 'var(--palette-text-primary)',
                                                                }}
                                                            >
                                                                {ticket.stationName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    color: 'var(--palette-text-primary)',
                                                                }}
                                                            >
                                                                {ticket.drawDate
                                                                    ? dayjs(ticket.drawDate).format(
                                                                          'DD/MM/YYYY'
                                                                      )
                                                                    : 'N/A'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    color: 'var(--palette-text-primary)',
                                                                }}
                                                            >
                                                                {(ticket.price || ticket.lineSubtotal || 10000).toLocaleString(
                                                                    'vi-VN'
                                                                )}
                                                                đ
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <AdminStatusBadge
                                                                label={activityBadge.label}
                                                                modifier={getOrderDetailStatusAdminBadgeModifier(ticket.status)}
                                                            />
                                                        </TableCell>
                                                        {cancelType === 'OUT_OF_STOCK_INCIDENT' && (
                                                            <TableCell align="center">
                                                                <Stack
                                                                    direction="row"
                                                                    spacing={1}
                                                                    alignItems="center"
                                                                    justifyContent="center"
                                                                >
                                                                    <Button
                                                                        size="small"
                                                                        variant={
                                                                            isReporting
                                                                                ? 'contained'
                                                                                : hasStartedFilling
                                                                                  ? 'contained'
                                                                                  : 'outlined'
                                                                        }
                                                                        color={
                                                                            hasStartedFilling && !isReporting
                                                                                ? 'warning'
                                                                                : 'error'
                                                                        }
                                                                        onClick={() =>
                                                                            handleIncidentClick(ticket)
                                                                        }
                                                                        startIcon={
                                                                            isReporting ? (
                                                                                <Icon icon="solar:alt-arrow-up-linear" width={16} />
                                                                            ) : hasStartedFilling ? (
                                                                                <Icon icon="solar:pen-bold" width={16} />
                                                                            ) : (
                                                                                <Icon icon="solar:danger-triangle-bold" width={16} />
                                                                            )
                                                                        }
                                                                        sx={{
                                                                            textTransform: 'none',
                                                                            py: 0.5,
                                                                            px: 1.5,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            borderRadius: '8px',
                                                                            boxShadow: 'none',
                                                                        }}
                                                                    >
                                                                        {isReporting
                                                                            ? 'Thu gọn'
                                                                            : hasStartedFilling
                                                                              ? 'Chỉnh sửa'
                                                                              : 'Báo sự cố'}
                                                                    </Button>
                                                                    {state &&
                                                                        (state.faultedBy ||
                                                                            state.damagedReason) && (
                                                                            <IconButton
                                                                                size="small"
                                                                                color="error"
                                                                                onClick={(e) =>
                                                                                    handleCancelIncident(
                                                                                        ticket.id!,
                                                                                        e
                                                                                    )
                                                                                }
                                                                                sx={{
                                                                                    p: 0.5,
                                                                                    bgcolor: 'error.lighter',
                                                                                    '&:hover': {
                                                                                        bgcolor: 'error.light',
                                                                                        color: 'common.white',
                                                                                    },
                                                                                }}
                                                                                title="Xóa sự cố đã ghi nhận"
                                                                            >
                                                                                <Icon
                                                                                    icon="solar:trash-bin-trash-bold"
                                                                                    fontSize={16}
                                                                                />
                                                                            </IconButton>
                                                                        )}
                                                                </Stack>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                    {cancelType === 'OUT_OF_STOCK_INCIDENT' &&
                                                        renderIncidentForm(ticket)}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {cancelType === 'OUT_OF_STOCK_INCIDENT' && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 1.5 }}
                                >
                                    Cần hoàn tất báo lỗi cho cả {tickets.length} vé trước khi xác nhận. Đơn sẽ được hủy toàn bộ và tạo yêu cầu hoàn tiền.
                                </Typography>
                            )}
                        </SectionCard>

                        <SectionCard title="Tóm tắt hoàn tiền" icon="solar:wallet-money-bold-duotone">
                            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3 }}>
                                <AdminKpiCard
                                    label="Tổng tiền hoàn dự kiến"
                                    value={formatKpiAmount(refundAmount)}
                                    valueTitle={formatVnd(refundAmount)}
                                    icon="solar:wallet-money-bold-duotone"
                                    tone="amber"
                                    accent
                                    valueSize="compact"
                                />
                                <AdminKpiCard
                                    label="Số vé hoàn"
                                    value={String(tickets.length)}
                                    icon="solar:ticket-bold-duotone"
                                    tone="cyan"
                                />
                                <AdminKpiCard
                                    label="Loại hoàn tiền"
                                    value="Toàn bộ đơn"
                                    icon="solar:document-text-bold-duotone"
                                    tone="blue"
                                />
                            </AdminKpiCardsGrid>
                        </SectionCard>

                        <SectionCard title="Bước 3 — Xác nhận lý do hủy" icon="solar:document-text-bold-duotone">
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'var(--palette-text-disabled)',
                                    display: 'block',
                                    mb: 1,
                                }}
                            >
                                Lý do hủy đơn và hoàn tiền *
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value.slice(0, 500))}
                                placeholder="Mô tả lý do hủy đơn để bộ phận hoàn tiền và khách hàng dễ đối chiếu..."
                                helperText="Hệ thống đã điền sẵn theo loại hủy. Hãy kiểm tra và chỉnh lại nếu cần trước khi xác nhận."
                                disabled={cancelMutation.isPending}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.disabled',
                                    display: 'block',
                                    mt: 1,
                                    textAlign: 'right',
                                }}
                            >
                                {cancelReason.length}/500
                            </Typography>
                        </SectionCard>

                        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 0.5 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() =>
                                        router.push(`/${prefixAdmin}/order/detail/${order.id}`)
                                    }
                                    disabled={cancelMutation.isPending}
                                    sx={{
                                        height: 36,
                                        px: 2,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        color: 'var(--palette-text-secondary)',
                                        borderColor: 'var(--palette-divider)',
                                    }}
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    startIcon={
                                        <Icon icon="solar:check-circle-bold-duotone" />
                                    }
                                    sx={{
                                        height: 36,
                                        px: 2,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        boxShadow: 'none',
                                        bgcolor: 'var(--palette-grey-800)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                                        '&.Mui-disabled': {
                                            bgcolor: 'var(--palette-action-disabledBackground)',
                                            color: 'var(--palette-action-disabled)',
                                        },
                                    }}
                                >
                                    {cancelMutation.isPending
                                        ? 'Đang xử lý...'
                                        : 'Xác nhận hủy đơn & tạo hoàn tiền'}
                                </Button>
                        </Stack>
                    </Stack>
                </Collapse>
            </Stack>

            {visibleTypeOptions.length === 0 && (
                <Typography sx={{ mt: 2 }} color="text.secondary">
                    Không có thao tác hủy kèm hoàn tiền phù hợp với trạng thái đơn và giờ chốt bán vé hiện tại.
                </Typography>
            )}
            {!cancelType && <Divider sx={{ my: 2 }} />}
        </Box>
    );
}
