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
import { UploadFiles } from '@/admin/components/ui/UploadFiles';

type StaffCancelType = StaffCancelOrderWithRefundRequest['cancelType'];

type TicketIncidentState = {
    faultedBy: 'DAMAGED' | 'LOST' | '';
    damagedReason: string;
    damagedEvidenceUrl: string;
    damagedEvidenceFiles?: any[];
};

const QUICK_INCIDENT_REASONS: Record<string, string[]> = {
    DAMAGED: ['Bị rách nát', 'Mờ số / không đọc được mã', 'Bị ướt / phai màu'],
    LOST: ['Không tìm thấy trong kho', 'Mất mát không rõ lý do'],
};

const CANCEL_TYPE_OPTIONS: {
    value: StaffCancelType;
    title: string;
    description: string;
    preparingOnly?: boolean;
}[] = [
    {
        value: 'ADMIN_FORCE_CANCEL',
        title: 'Hủy hộ khách hàng',
        description:
            'Khách yêu cầu hủy qua CSKH sau thời gian cho phép / nhân viên hủy đơn hộ khách. Hệ thống tạo yêu cầu hoàn tiền toàn bộ đơn.',
    },
    {
        value: 'OUT_OF_STOCK_INCIDENT',
        title: 'Sự cố kho — hủy toàn bộ đơn',
        description:
            '100% vé trong đơn bị rách/thất lạc và không còn vé thay thế. Bắt buộc báo lỗi từng vé trước khi hủy và hoàn tiền.',
        preparingOnly: true,
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

    const tickets = useMemo(() => {
        if (!order?.orderDetails) return [];
        return (order.orderDetails as any[])
            .map((d) => ({
                ...resolveOrderDetailTicketDisplay(d),
                lineSubtotal: Number(d.lineSubtotal ?? d.price ?? 10000),
                raw: d,
            }))
            .filter((t) => t.id != null && t.isIncidentEligible);
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
                                p: { xs: 2.5, md: 3 },
                                bgcolor: 'var(--palette-background-neutral)',
                                borderRadius: '0 0 12px 12px',
                                mb: 2,
                                border: '1px solid var(--palette-divider)',
                                borderTop: 'none',
                            }}
                        >
                            <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: { xs: 'flex-start', md: 'center' },
                                        gap: 1,
                                        flexWrap: 'wrap',
                                        textAlign: { xs: 'left', md: 'center' },
                                    }}
                                >
                                    Xử lý sự cố cho vé:
                                    <Box
                                        component="span"
                                        sx={{
                                            color: 'primary.main',
                                            bgcolor: 'primary.lighter',
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                        }}
                                    >
                                        {TICKET_NUMBERS_LABEL}{' '}
                                        <AdminLuckyDisplay value={ticket.numbers} ticket component="span" />
                                    </Box>
                                    {ticket.serialNumber && (
                                        <Box
                                            component="span"
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: '0.8em',
                                                fontWeight: 500,
                                                bgcolor: 'action.hover',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                            }}
                                        >
                                            SN: {ticket.serialNumber}
                                        </Box>
                                    )}
                                </Typography>

                                <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ mb: 1, color: 'text.secondary' }}
                                    >
                                        Lý do báo lỗi (Faulted By)
                                    </Typography>
                                    <ToggleButtonGroup
                                        color="primary"
                                        value={state.faultedBy || null}
                                        exclusive
                                        onChange={(_, value) => {
                                            if (value !== null) {
                                                updateIncident(ticketId, { faultedBy: value });
                                            }
                                        }}
                                        sx={{
                                            width: '100%',
                                            height: '40px',
                                            '& .MuiToggleButton-root': {
                                                flex: 1,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                border: '1px solid var(--palette-divider)',
                                            },
                                        }}
                                    >
                                        <ToggleButton value="DAMAGED">Vé rách / Hư hỏng</ToggleButton>
                                        <ToggleButton value="LOST">Thất lạc</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>

                                {state.faultedBy && (
                                    <Grid container spacing={3} alignItems="stretch">
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Stack spacing={2} sx={{ height: '100%' }}>
                                                <Box>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{ mb: 1, color: 'text.secondary' }}
                                                    >
                                                        Chi tiết lý do
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        minRows={state.faultedBy === 'LOST' ? 4 : 3}
                                                        value={state.damagedReason}
                                                        onChange={(e) =>
                                                            updateIncident(ticketId, {
                                                                damagedReason: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Nhập chi tiết sự cố..."
                                                    />
                                                </Box>
                                                {QUICK_INCIDENT_REASONS[state.faultedBy] && (
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: 'text.secondary',
                                                                display: 'block',
                                                                mb: 1,
                                                            }}
                                                        >
                                                            Gợi ý nhanh
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            {QUICK_INCIDENT_REASONS[
                                                                state.faultedBy
                                                            ].map((reason) => (
                                                                <Typography
                                                                    key={reason}
                                                                    variant="caption"
                                                                    onClick={() =>
                                                                        updateIncident(ticketId, {
                                                                            damagedReason: reason,
                                                                        })
                                                                    }
                                                                    sx={{
                                                                        cursor: 'pointer',
                                                                        px: 1.25,
                                                                        py: 0.75,
                                                                        bgcolor: 'action.hover',
                                                                        borderRadius: 1,
                                                                        border: '1px solid var(--palette-divider)',
                                                                        '&:hover': {
                                                                            bgcolor: 'action.selected',
                                                                        },
                                                                    }}
                                                                >
                                                                    {reason}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Grid>

                                        <Grid size={{ xs: 12, md: 6 }}>
                                            {state.faultedBy === 'DAMAGED' ? (
                                                <Stack spacing={1} sx={{ height: '100%' }}>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{ mb: 0.5, color: 'text.secondary' }}
                                                    >
                                                        Ảnh minh chứng
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            alignItems: 'stretch',
                                                            minHeight: 140,
                                                        }}
                                                    >
                                                        <UploadFiles
                                                            compact
                                                            files={state.damagedEvidenceFiles || []}
                                                            onFilesChange={(files) => {
                                                                updateIncident(ticketId, {
                                                                    damagedEvidenceFiles: files,
                                                                    damagedEvidenceUrl: String(
                                                                        files.find(
                                                                            (f) =>
                                                                                typeof f === 'string'
                                                                        ) || ''
                                                                    ),
                                                                });
                                                            }}
                                                        />
                                                    </Box>
                                                </Stack>
                                            ) : (
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        minHeight: 140,
                                                        p: 2.5,
                                                        borderRadius: '12px',
                                                        border: '1px dashed var(--palette-divider)',
                                                        bgcolor: 'var(--palette-background-paper)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={1.5}
                                                        alignItems="flex-start"
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                bgcolor: 'var(--palette-warning-lighter)',
                                                                color: 'var(--palette-warning-dark)',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <Icon
                                                                icon="solar:box-minimalistic-bold-duotone"
                                                                width={20}
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{ fontWeight: 700, mb: 0.5 }}
                                                            >
                                                                Không còn vé thay thế
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                                sx={{ lineHeight: 1.6 }}
                                                            >
                                                                Vé thất lạc sẽ được ghi nhận trong quy
                                                                trình hủy toàn bộ đơn. Vui lòng mô tả
                                                                chi tiết sự cố ở cột bên trái.
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </Grid>
                                    </Grid>
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

    const canSubmit = useMemo(() => {
        if (!cancelType || !cancelReason.trim() || cancelMutation.isPending) return false;
        if (cancelType === 'OUT_OF_STOCK_INCIDENT') {
            return allIncidentsValid;
        }
        return true;
    }, [cancelType, cancelReason, cancelMutation.isPending, allIncidentsValid]);

    const handleSelectType = (type: StaffCancelType) => {
        if (type === 'OUT_OF_STOCK_INCIDENT' && order?.status !== OrderStatus.PREPARING) {
            toast.error('Hủy do sự cố kho chỉ áp dụng khi đơn đang ở trạng thái Đang chuẩn bị.');
            return;
        }
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
                            Hủy đơn luôn kèm yêu cầu hoàn tiền. Chọn loại hủy, kiểm tra thông tin rồi xác
                            nhận.
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

    const allowedStatuses: string[] = [
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.PENDING_PICKUP,
    ];
    if (!allowedStatuses.includes(order.status)) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography>
                    Chỉ có thể báo lỗi & hủy đơn khi đơn ở trạng thái Đã thanh toán / Đang chuẩn bị /
                    Chờ nhận vé.
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
        (opt) => !opt.preparingOnly || order.status === OrderStatus.PREPARING
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
                        Hủy đơn luôn kèm yêu cầu hoàn tiền. Chọn loại hủy, kiểm tra thông tin rồi xác
                        nhận.
                    </Typography>
                </Box>
            </Stack>

            <Stack spacing={2.5}>
                <SectionCard title="Bước 1 — Loại hủy đơn" icon="solar:checklist-bold-duotone">
                    <Grid container spacing={2}>
                        {visibleTypeOptions.map((opt) => {
                            const selected = cancelType === opt.value;
                            return (
                                <Grid key={opt.value} size={{ xs: 12, md: 6 }}>
                                    <Box
                                        onClick={() => handleSelectType(opt.value)}
                                        sx={{
                                            p: 2.5,
                                            height: '100%',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
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
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 700, mb: 0.75 }}>
                                            {opt.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
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

                        <SectionCard title="Thông tin vé trong đơn" icon="solar:ticket-bold-duotone">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Danh sách vé trong đơn
                            </Typography>
                            <TableContainer
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'var(--palette-divider)',
                                    borderRadius: '12px',
                                }}
                            >
                                <Table size="small">
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
                                                Đài
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
                                                Giá
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
                                                    align="right"
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
                                                            <TableCell align="right">
                                                                <Stack
                                                                    direction="row"
                                                                    spacing={1}
                                                                    alignItems="center"
                                                                    justifyContent="flex-end"
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            color: 'var(--palette-text-secondary)',
                                                                            fontWeight: 600,
                                                                        }}
                                                                    >
                                                                        Hết vé thay thế
                                                                    </Typography>
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
                                                                        sx={{
                                                                            textTransform: 'none',
                                                                            py: 0.25,
                                                                            minWidth: 'auto',
                                                                            fontSize: '0.75rem',
                                                                            borderRadius: '6px',
                                                                            boxShadow: 'none',
                                                                        }}
                                                                    >
                                                                        {isReporting
                                                                            ? 'Đóng'
                                                                            : hasStartedFilling
                                                                              ? 'Đã báo lỗi'
                                                                              : 'Báo lỗi'}
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
                                                                                title="Hủy thao tác"
                                                                            >
                                                                                <Icon
                                                                                    icon="solar:close-circle-bold"
                                                                                    fontSize={18}
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
                                    Phải báo lỗi (DAMAGED/LOST) cho toàn bộ {tickets.length} vé. Không
                                    chọn vé thay thế — đơn sẽ bị hủy toàn bộ.
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
                            <Box sx={{ mt: 1 }}>
                                <InfoField
                                    label="Tài khoản nhận hoàn"
                                    value="Chưa có — khách sẽ cung cấp STK"
                                />
                            </Box>
                        </SectionCard>

                        <SectionCard title="Chi tiết yêu cầu" icon="solar:document-text-bold-duotone">
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'var(--palette-text-disabled)',
                                    display: 'block',
                                    mb: 1,
                                }}
                            >
                                Lý do hủy / hoàn tiền *
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value.slice(0, 500))}
                                placeholder="Nhập lý do hủy đơn và hoàn tiền..."
                                helperText="Được điền sẵn theo loại hủy — có thể chỉnh trước khi xác nhận."
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

            {!cancelType && <Divider sx={{ my: 2 }} />}
        </Box>
    );
}
