"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import React, { useEffect, useMemo, useState } from 'react';
import { useOrderRefundsForInspection, useUpdateOrderStatus } from '../../hooks/useOrder';
import { getTickets } from '../../../ticket/inventory/services/ticketService';
import {
    getReplacementCandidates,
    handleOrderTicketIncidents,
    createPartialRefund,
} from '../../services/orderService';
import { toast } from 'react-toastify';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Autocomplete,
    ToggleButtonGroup,
    ToggleButton,
    IconButton,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { UploadFiles } from '../../../../components/ui/UploadFiles';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import dayjs from 'dayjs';
import {
    getOrderDetailStatusAdminBadgeModifier,
    resolveOrderDetailStatusBadge,
    OrderDetailStatus,
} from '../../../../../types/order.type';
import { resolveLotteryTicketSerialAdminBadge } from '../../utils/lotteryTicketSerialAdminBadge.util';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
} from '@/constants/ticketDisplay.constants';
import type { IncidentTicketDisplay } from '../../types/incidentTicket.type';
import { resolveOrderDetailTicketDisplay } from '../../utils/resolveOrderDetailTicketDisplay';
import { prefixAdmin, ROUTES } from '../../../../constants/routes';
import { RefundRequestResponse } from '../../../../../types/refund.type';

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

/** Quick suggestions for staff refund reason (UI-only; not persisted separately). */
const STAFF_REFUND_REASON_SUGGESTIONS = [
    'Vé bị rách/hư hỏng không thể sử dụng',
    'Vé bị thất lạc trong quá trình chuẩn bị đơn',
    'Không còn vé thay thế phù hợp trong kho',
    'Khách hàng yêu cầu hoàn tiền theo chính sách',
] as const;

export interface RefundOrderInfo {
    customerName?: string;
    phone?: string;
    email?: string;
    status?: string;
    statusLabel?: string;
    paymentStatusLabel?: string;
    createdAt?: string;
    totalAmount?: number;
    orderType?: string;
}

interface OrderInspectionSectionProps {
    open: boolean;
    orderCode?: string;
    orderId: string;
    orderDetails: any[];
    orderInfo?: RefundOrderInfo;
    onSuccess?: () => void;
    onCancel?: () => void;
    onMoveToReadyForPickup?: () => void;
}

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
            boxShadow: 'none',
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
            title={
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>
            }
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

interface TicketReplacementState {
    newTicketId?: number;
    faultedBy: 'DAMAGED' | 'LOST' | '';
    damagedReason: string;
    damagedEvidenceUrl: string;
    damagedEvidenceFiles?: any[];
}

export function OrderInspectionSection({
    open,
    orderCode,
    orderId,
    orderDetails,
    orderInfo,
    onSuccess,
    onCancel,
    onMoveToReadyForPickup,
}: OrderInspectionSectionProps) {
    const router = useAdminRouter();
    const { mutateAsync: updateStatus } = useUpdateOrderStatus();
    const [replacementAvailability, setReplacementAvailability] = useState<Record<number, boolean>>({});
    const [availableReplacements, setAvailableReplacements] = useState<Record<number, any[]>>({});
    const [replacements, setReplacements] = useState<Record<number, TicketReplacementState>>({});
    const [replaceTicket, setReplaceTicket] = useState<IncidentTicketDisplay | null>(null);
    const [openRefundDialog, setOpenRefundDialog] = useState(false);
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [selectedRefundReasonSuggestion, setSelectedRefundReasonSuggestion] = useState('');
    const [reportFaultTicket, setReportFaultTicket] = useState<IncidentTicketDisplay | null>(null);
    const [uploadingTicketIds, setUploadingTicketIds] = useState<Record<number, boolean>>({});

    const tickets = useMemo(
        () => (orderDetails || []).map(resolveOrderDetailTicketDisplay),
        [orderDetails]
    );

    const hasAlreadyFaultReportedTickets = useMemo(
        () => tickets.some((ticket) => ticket.isAlreadyFaultReported),
        [tickets]
    );

    const { data: orderRefundsResponse, isFetching: isFetchingOrderRefunds } = useOrderRefundsForInspection(
        orderId,
        !!orderId && hasAlreadyFaultReportedTickets
    );

    const linkedRefundRequests = useMemo(() => {
        const raw = orderRefundsResponse?.data;
        const list = Array.isArray(raw?.recordList)
            ? raw.recordList
            : Array.isArray(raw)
              ? raw
              : [];
        return [...list].sort((a, b) => {
            const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [orderRefundsResponse]);

    const latestRefundRequest: RefundRequestResponse | undefined = linkedRefundRequests[0];

    const handleViewRefundRequest = () => {
        if (isFetchingOrderRefunds) return;
        if (!latestRefundRequest?.id) {
            toast.info('Chưa có yêu cầu hoàn tiền cho các vé đã báo lỗi của đơn này');
            return;
        }
        router.push(`${ROUTES.ADMIN.REFUNDS.DETAIL}${latestRefundRequest.id}`);
    };

    const incidentTickets = useMemo(() => {
        if (!orderDetails || !replacements) return [];
        return orderDetails
            .filter((d: any) => replacements[d.id])
            .map((d: any) => {
                const ticket = d.lotteryTicket || d.ticket || {};
                const ticketSerial = d.ticketSerial || d.lotteryTicketSerial;
                const ticketImg = ticketSerial?.ticketImg || ticket?.ticketImg;
                const serialNumber = d.serialNumber || ticketSerial?.serialNumber || ticket.serialNumber;
                return {
                    id: d.id,
                    numbers: d.numbers || ticket.numbers || '—',
                    serialNumber: serialNumber || '—',
                    stationName: d.stationName || ticket.stationName || ticket.station?.name || '—',
                    ticketImg,
                    drawDate: d.drawDate || ticket.drawDate || '—',
                    lineSubtotal: d.lineSubtotal || d.price || ticket.price || 10000,
                    ...replacements[d.id],
                };
            });
    }, [orderDetails, replacements]);

    const loadReplacements = async (ticket: IncidentTicketDisplay) => {
        if (!ticket.id || ticket.isAlreadyFaultReported) return;
        try {
            const res = await getReplacementCandidates(orderId, ticket.id);
            const candidates = res.data || [];
            setAvailableReplacements(prev => ({
                ...prev,
                [ticket.id!]: candidates
            }));
            setReplacementAvailability(prev => ({ ...prev, [ticket.id!]: candidates.length > 0 }));
        } catch (e) { }
    };

    useEffect(() => {
        setReplacements({});
        setReplaceTicket(null);
        setReplacementAvailability({});
        setAvailableReplacements({});
    }, [orderId]);

    useEffect(() => {
        if (!open) {
            setReplacements({});
            setReplaceTicket(null);
            setReportFaultTicket(null);
        }
    }, [open]);

    useEffect(() => {
        tickets.forEach(ticket => {
            if (ticket.id != null && !ticket.isAlreadyFaultReported) {
                loadReplacements(ticket);
            }
        });
    }, [tickets, orderId]);

    const handleReportFaultClick = (ticket: IncidentTicketDisplay) => {
        if (ticket.isAlreadyFaultReported || !ticket.isIncidentEligible || ticket.id == null) {
            return;
        }
        const ticketId = ticket.id;
        if (!replacements[ticketId]) {
            setReplacements((prev) => ({
                ...prev,
                [ticketId]: {
                    faultedBy: '',
                    damagedReason: '',
                    damagedEvidenceUrl: '',
                    damagedEvidenceFiles: [],
                },
            }));
        }
        setReportFaultTicket(ticket);
    };

    const handleConfirmReportFault = () => {
        if (!reportFaultTicket?.id) return;
        const ticketId = reportFaultTicket.id;
        const state = replacements[ticketId];
        if (!state?.faultedBy) {
            toast.error('Vui lòng chọn phân loại sự cố vé (Vé hư hỏng hoặc Thất lạc)');
            return;
        }
        if (!state.damagedReason?.trim()) {
            toast.error('Vui lòng nhập mô tả chi tiết sự cố');
            return;
        }
        if (state.faultedBy === 'DAMAGED') {
            const hasEvidence = !!state.damagedEvidenceUrl || (Array.isArray(state.damagedEvidenceFiles) && state.damagedEvidenceFiles.length > 0);
            if (!hasEvidence) {
                toast.error('Vui lòng tải ảnh minh chứng cho vé hư hỏng');
                return;
            }
            if (uploadingTicketIds[ticketId]) {
                toast.error('Vui lòng đợi ảnh minh chứng tải lên hoàn tất');
                return;
            }
            const hasUnuploadedFiles = state.damagedEvidenceFiles?.some((f: any) => f instanceof File);
            if (hasUnuploadedFiles) {
                toast.error('Vui lòng đợi ảnh minh chứng tải lên hoàn tất');
                return;
            }
        }
        setReportFaultTicket(null);
        toast.success('Đã ghi nhận báo lỗi vé thành công');
    };

    const handleReplaceTicketClick = (ticket: IncidentTicketDisplay) => {
        if (ticket.isAlreadyFaultReported || !ticket.isIncidentEligible || ticket.id == null) {
            return;
        }
        const candidates = availableReplacements[ticket.id];
        const hasRep = Array.isArray(candidates) && candidates.length > 0;
        if (!hasRep) {
            handleReportFaultClick(ticket);
            return;
        }

        const ticketId = ticket.id;
        setReplaceTicket(ticket);
        if (!replacements[ticketId]) {
            setReplacements((prev) => ({
                ...prev,
                [ticketId]: {
                    faultedBy: '',
                    damagedReason: '',
                    damagedEvidenceUrl: '',
                    damagedEvidenceFiles: [],
                },
            }));
        }
    };

    const handleCancelReplacement = (ticketId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setReplacements(prev => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
        if (replaceTicket?.id === ticketId) {
            setReplaceTicket(null);
        }
    };

    const updateReplacement = (ticketId: number, field: keyof TicketReplacementState, value: any) => {
        setReplacements(prev => ({
            ...prev,
            [ticketId]: {
                ...prev[ticketId],
                [field]: value
            }
        }));
    };

    const isAllReplacementsValid = Object.entries(replacements).every(([ticketId, state]) => {
        if (!state.faultedBy) return false;
        if (!state.damagedReason?.trim()) return false;

        const candidates = availableReplacements[Number(ticketId)];
        const hasRep = candidates && candidates.length > 0;
        if (hasRep && !state.newTicketId) return false;

        if (state.faultedBy === 'DAMAGED') {
            const hasUrl = !!state.damagedEvidenceUrl;
            const hasFiles = Array.isArray(state.damagedEvidenceFiles) && state.damagedEvidenceFiles.length > 0;
            if (!hasUrl && !hasFiles) return false;
            const hasUnuploadedFiles = state.damagedEvidenceFiles?.some((f: any) => f instanceof File);
            if (hasUnuploadedFiles) return false;
        }

        return true;
    });

    const hasAnyReplacement = Object.keys(replacements).length > 0;

    const requiresRefund = Object.entries(replacements).some(([ticketId, state]) => {
        if (state.newTicketId) return false;
        const candidates = availableReplacements[Number(ticketId)];
        if (candidates === undefined) return false;
        return candidates.length === 0;
    });

    const eligibleTickets = useMemo(
        () => tickets.filter((t) => t.id != null && t.isIncidentEligible),
        [tickets]
    );

    const isFullOrderUnfulfillable = useMemo(() => {
        if (eligibleTickets.length === 0) return false;
        return eligibleTickets.every((t) => {
            const state = replacements[t.id!];
            if (!state?.faultedBy || state.newTicketId) return false;
            const candidates = availableReplacements[t.id!];
            return Array.isArray(candidates) && candidates.length === 0;
        });
    }, [eligibleTickets, replacements, availableReplacements]);

    const navigateToFullOrderCancel = () => {
        const replacementPayload: Record<
            number,
            {
                faultedBy: 'DAMAGED' | 'LOST';
                damagedReason: string;
                damagedEvidenceUrl: string;
            }
        > = {};
        for (const t of eligibleTickets) {
            const state = replacements[t.id!];
            if (!state?.faultedBy) continue;
            replacementPayload[t.id!] = {
                faultedBy: state.faultedBy as 'DAMAGED' | 'LOST',
                damagedReason: state.damagedReason || '',
                damagedEvidenceUrl: state.damagedEvidenceUrl || '',
            };
        }
        sessionStorage.setItem(
            "daiphat:order-cancel-refund-state",
            JSON.stringify({
                cancelType: "OUT_OF_STOCK_INCIDENT" as const,
                replacements: replacementPayload,
            }),
        );
        router.push(`/${prefixAdmin}/order/detail/${orderId}/cancel-with-refund`);
    };

    const quickReasons: Record<string, string[]> = {
        DAMAGED: ["Bị rách nát", "Mờ số / không đọc được mã", "Bị ướt / phai màu"],
        LOST: ["Không tìm thấy trong kho", "Mất mát không rõ lý do"]
    };

    const totalRefundAmount = incidentTickets.reduce((sum, t) => {
        const candidates = t.id != null ? availableReplacements[t.id] : undefined;
        const cannotReplace = !t.newTicketId && Array.isArray(candidates) && candidates.length === 0;
        if (cannotReplace) {
            return sum + (Number(t.lineSubtotal) || 10000);
        }
        return sum;
    }, 0);

    const refundOnlyTickets = useMemo(
        () =>
            incidentTickets.filter((t) => {
                if (t.newTicketId) return false;
                const candidates = t.id != null ? availableReplacements[t.id] : undefined;
                return Array.isArray(candidates) && candidates.length === 0;
            }),
        [incidentTickets, availableReplacements]
    );

    const openRefundRequestDialog = () => {
        setRefundReason('');
        setSelectedRefundReasonSuggestion('');
        setOpenRefundDialog(true);
    };

    const applyStaffRefundReasonSuggestion = (suggestion: string) => {
        setRefundReason(suggestion);
        setSelectedRefundReasonSuggestion(suggestion);
    };

    const handleRefundSubmit = async () => {
        if (!replacements) return;
        const reason = refundReason.trim();
        if (!reason) {
            toast.error('Vui lòng nhập lý do hoàn tiền');
            return;
        }
        setIsSubmittingRefund(true);
        try {
            const incidents = incidentTickets.map(t => ({
                orderDetailId: t.id!,
                reason: t.faultedBy as 'DAMAGED' | 'LOST',
                replacementTicketId: t.newTicketId,
                damagedReason: t.damagedReason,
                damagedEvidenceUrl: t.damagedEvidenceUrl,
            }));

            await createPartialRefund(orderId, {
                incidents,
                refundReason: reason,
            });

            await updateStatus({ id: orderId, status: 'PENDING_PICKUP' });

            toast.success('Đã tạo yêu cầu hoàn tiền và cập nhật đơn hàng thành công');
            setOpenRefundDialog(false);
            if (onCancel) onCancel();
            if (onSuccess) onSuccess();
            router.push(`/${prefixAdmin}/refunds/list`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu hoàn tiền');
        } finally {
            setIsSubmittingRefund(false);
        }
    };


    const handlePrimaryAction = async () => {
        if (isFullOrderUnfulfillable) {
            navigateToFullOrderCancel();
            return;
        }
        if (requiresRefund) {
            openRefundRequestDialog();
        } else {
            try {
                if (hasAnyReplacement) {
                    const incidents = Object.entries(replacements).map(([ticketId, state]) => ({
                        orderDetailId: Number(ticketId),
                        reason: state.faultedBy as 'DAMAGED' | 'LOST',
                        replacementTicketId: state.newTicketId,
                        damagedReason: state.damagedReason,
                        damagedEvidenceUrl: state.damagedEvidenceUrl
                    }));
                    await createPartialRefund(orderId, { incidents });
                    await updateStatus({ id: orderId, status: 'PENDING_PICKUP' });
                    toast.success('Đã đổi vé và chuyển sang chờ nhận vé thành công');
                    if (onCancel) onCancel();
                    if (onSuccess) onSuccess();
                    return;
                }
                if (onMoveToReadyForPickup) {
                    onMoveToReadyForPickup();
                }
            } catch (error: any) {
                const fallback = hasAnyReplacement
                    ? 'Có lỗi xảy ra khi xử lý thay vé'
                    : 'Có lỗi xảy ra khi chuyển sang chờ nhận vé';
                toast.error(error?.response?.data?.message || fallback);
            }
        }
    };

    const renderIncidentFormBody = (
        ticket: IncidentTicketDisplay,
        isReplacementMode: boolean
    ) => {
        const ticketId = ticket.id!;
        const state = replacements[ticketId] || {
            faultedBy: '',
            damagedReason: '',
            damagedEvidenceUrl: '',
            damagedEvidenceFiles: [],
        };
        const candidates = availableReplacements[ticketId] || [];
        const hasCandidates = Array.isArray(candidates) && candidates.length > 0;

        return (
            <Stack spacing={2.5}>
                {/* Header Ticket Information */}
                <Box
                    sx={{
                        p: { xs: 2, md: 2.25 },
                        borderRadius: '12px',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: 'var(--palette-warning-lighter, #fff7ed)',
                                color: 'var(--palette-warning-dark, #ea580c)',
                                flexShrink: 0,
                            }}
                        >
                            <Icon icon="solar:ticket-bold-duotone" width={24} />
                        </Box>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        color: 'text.primary',
                                    }}
                                >
                                    Ghi nhận sự cố vé số
                                </Typography>
                                <AdminLuckyDisplay
                                    value={ticket.numbers}
                                    ticket
                                    fontSize="0.95rem"
                                    fontWeight={700}
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

                    <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
                        {ticket.serialNumber && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`${TICKET_SERIAL_PREFIX}: ${ticket.serialNumber}`}
                                sx={{
                                    height: 26,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                }}
                            />
                        )}
                        {ticket.stationName && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Đài: ${ticket.stationName}`}
                                sx={{
                                    height: 26,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    bgcolor: 'var(--palette-background-neutral, #f4f6f8)',
                                }}
                            />
                        )}
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
                </Box>

                {/* 1. Phân loại sự cố vé */}
                <Box sx={{ width: '100%' }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.875rem' }}
                    >
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
                                updateReplacement(ticketId, 'faultedBy', value);
                                if (value !== state.faultedBy) {
                                    updateReplacement(ticketId, 'damagedReason', '');
                                }
                                if (value === 'LOST') {
                                    updateReplacement(ticketId, 'damagedEvidenceUrl', '');
                                    updateReplacement(ticketId, 'damagedEvidenceFiles', []);
                                }
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
                                        value={state.damagedReason || ''}
                                        onChange={(e) => updateReplacement(ticketId, 'damagedReason', e.target.value)}
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
                                                        onClick={() => updateReplacement(ticketId, 'damagedReason', reason)}
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
                                        updateReplacement(ticketId, 'damagedEvidenceUrl', urlStr);
                                        updateReplacement(
                                            ticketId,
                                            'damagedEvidenceFiles',
                                            urlStr ? [urlStr] : fileOrUrl instanceof File ? [fileOrUrl] : []
                                        );
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
                                    value={state.damagedReason || ''}
                                    onChange={(e) => updateReplacement(ticketId, 'damagedReason', e.target.value)}
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
                                                    onClick={() => updateReplacement(ticketId, 'damagedReason', reason)}
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
                )}

                {/* Chọn vé thay thế trong kho */}
                {isReplacementMode && hasCandidates && (
                    <Box
                        sx={{
                            width: '100%',
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: state.newTicketId ? 'primary.main' : 'divider',
                            bgcolor: 'background.paper',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                {state.faultedBy === 'DAMAGED' ? '4. Chọn vé thay thế trong kho' : '3. Chọn vé thay thế trong kho'} <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={`Còn ${candidates.length} vé khả dụng`}
                                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mb: 1.5 }}>
                            Chọn một vé số tương ứng còn trong kho có cùng đài xổ và ngày mở thưởng để đổi cho khách hàng.
                        </Typography>

                        <Autocomplete
                            options={candidates}
                            getOptionLabel={(o) => `${o.serialNumber ? `${o.serialNumber}` : `ID #${o.id}`}${o.numbers ? ` — Số: ${o.numbers}` : ''}`}
                            value={candidates.find((c) => c.id === state.newTicketId) || null}
                            onChange={(_, val) => updateReplacement(ticketId, 'newTicketId', val?.id)}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.id} sx={{ py: 1, px: 1.5 }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '6px',
                                                    bgcolor: 'primary.lighter',
                                                    color: 'primary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                <Icon icon="solar:ticket-linear" width={18} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                                    {option.serialNumber || `Vé #${option.id}`}
                                                </Typography>
                                                {option.numbers && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Số vé: {option.numbers}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                        <Chip size="small" label="Khả dụng" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }} />
                                    </Stack>
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Chọn vé thay thế..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <Box sx={{ color: 'text.secondary', mr: 1, display: 'flex', alignItems: 'center' }}>
                                                <Icon icon="solar:magnifer-linear" width={18} />
                                            </Box>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Box>
                )}
            </Stack>
        );
    };

    const renderReplaceModal = () => {
        if (!replaceTicket || replaceTicket.id == null) return null;
        const ticket = replaceTicket;
        const ticketId = ticket.id!;
        const state = replacements[ticketId] || {};
        const candidates = availableReplacements[ticketId];
        const hasReplacementCandidates = Array.isArray(candidates) && candidates.length > 0;
        const isUploading = !!uploadingTicketIds[ticketId];

        const handleConfirm = () => {
            if (!state.faultedBy) {
                toast.error('Vui lòng chọn phân loại sự cố vé (Vé hư hỏng hoặc Thất lạc)');
                return;
            }
            if (!state.damagedReason?.trim()) {
                toast.error('Vui lòng nhập mô tả chi tiết sự cố vé');
                return;
            }
            if (state.faultedBy === 'DAMAGED') {
                const hasEvidence = !!state.damagedEvidenceUrl || (Array.isArray(state.damagedEvidenceFiles) && state.damagedEvidenceFiles.length > 0);
                if (!hasEvidence) {
                    toast.error('Vui lòng tải ảnh minh chứng cho vé hư hỏng');
                    return;
                }
                if (isUploading) {
                    toast.error('Vui lòng đợi ảnh minh chứng tải lên hoàn tất');
                    return;
                }
            }
            if (hasReplacementCandidates && !state.newTicketId) {
                toast.error('Vui lòng chọn vé thay thế trong kho');
                return;
            }
            setReplaceTicket(null);
            toast.success(hasReplacementCandidates ? 'Đã lưu thông tin thay thế vé' : 'Đã ghi nhận sự cố vé');
        };

        return (
            <Dialog
                open
                onClose={() => setReplaceTicket(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    className: 'admin-theme',
                    sx: { borderRadius: '16px', overflow: 'hidden' },
                }}
            >
                <DialogTitle component="div" sx={{ p: 2.5, pb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: hasReplacementCandidates ? 'var(--palette-primary-lighter)' : 'var(--palette-error-lighter)',
                                    color: hasReplacementCandidates ? 'var(--palette-primary-dark)' : 'var(--palette-error-dark)',
                                }}
                            >
                                <Icon icon={hasReplacementCandidates ? "solar:ticket-bold-duotone" : "solar:danger-triangle-bold-duotone"} width={22} />
                            </Box>
                            <Box>
                                <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                    {hasReplacementCandidates ? 'Thay thế vé' : 'Báo lỗi vé'}
                                </Typography>
                                <Typography component="div" variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.8125rem' }}>
                                    {hasReplacementCandidates
                                        ? `Đơn ${orderCode || orderId} · Xử lý sự cố và thay vé từ kho`
                                        : `Kho không còn vé thay thế — vé này sẽ được ghi nhận để hoàn tiền sau`}
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={() => setReplaceTicket(null)} size="small" aria-label="Đóng">
                            <Icon icon="solar:close-circle-bold" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: 'var(--palette-background-neutral, #f4f6f8)' }}>
                    {renderIncidentFormBody(ticket, true)}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setReplaceTicket(null)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: 'text.secondary', borderColor: 'divider' }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color={hasReplacementCandidates ? "primary" : "error"}
                        onClick={handleConfirm}
                        disabled={isUploading}
                        startIcon={<Icon icon="solar:check-circle-bold" width={18} />}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', boxShadow: 'none' }}
                    >
                        {hasReplacementCandidates ? 'Xác nhận thay vé' : 'Xác nhận báo lỗi'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onCancel}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    className: 'admin-theme',
                    sx: {
                        borderRadius: 'var(--shape-borderRadius-lg)',
                        maxHeight: '92vh',
                    },
                }}
            >
            <DialogTitle component="div" sx={{ p: 3, pb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'var(--palette-primary-lighter)',
                                color: 'var(--palette-primary-dark)',
                            }}
                        >
                            <Icon icon="solar:magnifer-zoom-in-bold-duotone" width={22} />
                        </Box>
                        <Box>
                            <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                Kiểm tra vé
                            </Typography>
                            <Typography component="div" variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                                Đơn {orderCode || orderId} · {tickets.length} vé
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={onCancel} size="small" aria-label="Đóng">
                        <Icon icon="solar:close-circle-bold" />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} spacing={1.5}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Danh sách vé trong đơn
                            </Typography>
                            {hasAlreadyFaultReportedTickets && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    onClick={handleViewRefundRequest}
                                    disabled={isFetchingOrderRefunds}
                                    startIcon={
                                        isFetchingOrderRefunds ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : (
                                            <Icon icon="solar:wallet-money-bold-duotone" width={16} />
                                        )
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        px: 1.25,
                                        py: 0.5,
                                        whiteSpace: 'nowrap',
                                        bgcolor: 'var(--palette-warning-lighter)',
                                        borderColor: 'var(--palette-warning-main)',
                                        color: 'var(--palette-warning-dark)',
                                        '&:hover': {
                                            bgcolor: 'var(--palette-warning-light)',
                                            borderColor: 'var(--palette-warning-dark)',
                                        },
                                    }}
                                >
                                    Xem đơn hoàn tiền
                                    {latestRefundRequest?.id ? ` #${latestRefundRequest.id}` : ''}
                                </Button>
                            )}
                        </Stack>
                        
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
                                        <TableCell align="center" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Vé số</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Đài</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Ngày xổ</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Giá</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                        <TableCell align="right" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không có vé trong đơn
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {tickets.map((ticket) => {
                                        const disabled = !ticket.isIncidentEligible || ticket.id == null;
                                        const serialBadge = resolveLotteryTicketSerialAdminBadge(
                                            ticket.serialStatus,
                                            ticket.serialStatusDisplayName,
                                            ticket.ticketCondition,
                                            ticket.ticketConditionDisplayName
                                        );
                                        const activityBadge = resolveOrderDetailStatusBadge(
                                            ticket.status,
                                            ticket.statusDisplayName
                                        );
                                        const candidates = ticket.id != null ? availableReplacements[ticket.id] : undefined;
                                        const isLoading = ticket.id != null && candidates === undefined;
                                        const hasRep = ticket.id != null && !isLoading && !!candidates && candidates.length > 0;
                                        const isReplacing = false;
                                        const hasReplaced = ticket.id != null && !!replacements[ticket.id]?.newTicketId;
                                        const alreadyFaultReported = !!ticket.isAlreadyFaultReported;
                                        const hasLocalFaultReport =
                                            ticket.id != null
                                            && !!replacements[ticket.id]?.faultedBy
                                            && !!replacements[ticket.id]?.damagedReason
                                            && !replacements[ticket.id]?.newTicketId;

                                        return (
                                            <React.Fragment key={ticket.id ?? ticket.numbers}>
                                                <TableRow
                                                    hover={!disabled && !alreadyFaultReported}
                                                    sx={{ opacity: disabled ? 0.55 : 1, '&:last-child td, &:last-child th': { border: 0 } }}
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
                                                                    {TICKET_SERIAL_PREFIX}: {ticket.serialNumber}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {ticket.stationName}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                            {ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {(ticket.price || 10000).toLocaleString('vi-VN')}đ
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.5} alignItems="flex-start">
                                                            <AdminStatusBadge
                                                                label={serialBadge.label}
                                                                modifier={serialBadge.modifier}
                                                            />
                                                            {ticket.status &&
                                                            ticket.status !== OrderDetailStatus.PROXY_HOLDING &&
                                                            ticket.status !== 'PROXY_HOLDING' &&
                                                            activityBadge.label !== 'Công ty đang giữ vé' && (
                                                                <AdminStatusBadge
                                                                    label={activityBadge.label}
                                                                    modifier={getOrderDetailStatusAdminBadgeModifier(ticket.status)}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                            {alreadyFaultReported ? (
                                                                <Stack spacing={0.25} alignItems="flex-end">
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            color: 'var(--palette-error-dark)',
                                                                            fontWeight: 800,
                                                                            bgcolor: 'var(--palette-error-lighter)',
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: '6px',
                                                                        }}
                                                                    >
                                                                        Đã báo lỗi
                                                                    </Typography>
                                                                </Stack>
                                                            ) : isLoading ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: 26, px: 2 }}>
                                                                    <CircularProgress size={16} />
                                                                </Box>
                                                            ) : hasRep ? (
                                                                <Button
                                                                    size="small"
                                                                    variant={hasReplaced ? "contained" : "outlined"}
                                                                    color={hasReplaced ? "success" : "primary"}
                                                                    disabled={disabled}
                                                                    onClick={() => ticket.id != null && handleReplaceTicketClick(ticket)}
                                                                    sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                >
                                                                    {hasReplaced ? "Đã thay vé" : `Thay vé (Còn ${candidates!.length} vé)`}
                                                                </Button>
                                                            ) : hasLocalFaultReport ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: 'var(--palette-error-dark)',
                                                                        fontWeight: 800,
                                                                        bgcolor: 'var(--palette-error-lighter)',
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: '6px',
                                                                    }}
                                                                >
                                                                    Đã ghi nhận lỗi
                                                                </Typography>
                                                            ) : (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="error"
                                                                    disabled={disabled}
                                                                    onClick={() => handleReportFaultClick(ticket)}
                                                                    sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                >
                                                                    Báo lỗi {candidates && candidates.length === 0 && "(Hết vé)"}
                                                                </Button>
                                                            )}
                                                            {!alreadyFaultReported && ticket.id != null && replacements[ticket.id] && (
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="error" 
                                                                    onClick={(e) => handleCancelReplacement(ticket.id!, e)}
                                                                    sx={{ p: 0.5, bgcolor: 'error.lighter' }}
                                                                >
                                                                    <Icon icon="solar:close-circle-bold" fontSize={18} />
                                                                </IconButton>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Stack>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 3, gap: 2 }}>
                <Button
                    onClick={onCancel}
                    variant="outlined"
                    sx={{ color: 'var(--palette-text-secondary)', borderColor: 'var(--palette-divider)' }}
                >
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color={isFullOrderUnfulfillable || requiresRefund ? "warning" : "primary"}
                    startIcon={
                        <Icon
                            icon={
                                isFullOrderUnfulfillable
                                    ? 'solar:danger-triangle-bold-duotone'
                                    : requiresRefund
                                      ? 'solar:wallet-money-bold-duotone'
                                      : 'solar:check-circle-bold-duotone'
                            }
                        />
                    }
                    onClick={handlePrimaryAction}
                    disabled={hasAnyReplacement && !isAllReplacementsValid}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        ...( !isFullOrderUnfulfillable && !requiresRefund && {
                            bgcolor: 'var(--palette-grey-800)', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                        })
                    }}
                >
                    {isFullOrderUnfulfillable
                        ? 'Báo lỗi & Hủy đơn'
                        : requiresRefund
                          ? 'Chuyển sang Chờ nhận vé & Tạo yêu cầu hoàn tiền'
                          : 'Chuyển sang "Chờ nhận vé"'}
                </Button>
            </DialogActions>
            </Dialog>

            {/* Pop-up Tạo yêu cầu hoàn tiền */}
            <Dialog
                open={openRefundDialog}
                onClose={() => !isSubmittingRefund && setOpenRefundDialog(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--shape-borderRadius-lg)',
                        boxShadow: 'var(--customShadows-z20)',
                        maxHeight: '92vh',
                    },
                }}
            >
                <DialogTitle
                    component="div"
                    sx={{
                        p: 3,
                        pb: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography component="div" variant="h6" sx={{ fontWeight: 700 }}>
                            Tạo yêu cầu hoàn tiền
                        </Typography>
                        <Typography component="div" variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Kiểm tra thông tin đơn hàng và vé sự cố trước khi xác nhận tạo yêu cầu.
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={() => !isSubmittingRefund && setOpenRefundDialog(false)}
                        disabled={isSubmittingRefund}
                    >
                        <Icon icon="solar:close-circle-bold" />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 3, bgcolor: 'var(--palette-background-default)' }}>
                    <Stack spacing={2.5}>
                        <SectionCard title="Thông tin đơn hàng" icon="solar:bill-list-bold-duotone">
                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Mã đơn hàng"
                                        value={orderCode || orderId}
                                        emphasize
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Khách hàng"
                                        value={orderInfo?.customerName || '—'}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Số điện thoại"
                                        value={orderInfo?.phone || orderInfo?.email || '—'}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Ngày đặt"
                                        value={
                                            orderInfo?.createdAt
                                                ? dayjs(orderInfo.createdAt).format('DD/MM/YYYY HH:mm')
                                                : '—'
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Trạng thái đơn"
                                        value={
                                            <Chip
                                                size="small"
                                                label={orderInfo?.statusLabel || orderInfo?.status || 'PREPARING'}
                                                sx={{
                                                    fontWeight: 700,
                                                    height: 24,
                                                    bgcolor: 'var(--palette-primary-lighter)',
                                                    color: 'var(--palette-primary-dark)',
                                                }}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Thanh toán"
                                        value={
                                            <Chip
                                                size="small"
                                                label={orderInfo?.paymentStatusLabel || 'Đã thanh toán'}
                                                sx={{
                                                    fontWeight: 700,
                                                    height: 24,
                                                    bgcolor: 'rgba(34, 197, 94, 0.16)',
                                                    color: 'var(--palette-success-main)',
                                                }}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Loại đơn"
                                        value={
                                            orderInfo?.orderType === 'DIRECT'
                                                ? 'Tại quầy'
                                                : 'Trực tuyến'
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoField
                                        label="Tổng tiền đơn"
                                        value={
                                            orderInfo?.totalAmount != null
                                                ? new Intl.NumberFormat('vi-VN', {
                                                      style: 'currency',
                                                      currency: 'VND',
                                                  }).format(Number(orderInfo.totalAmount))
                                                : '—'
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        <SectionCard
                            title="Thông tin vé trong đơn"
                            icon="solar:ticket-bold-duotone"
                            action={
                                <Chip
                                    size="small"
                                    label={`${incidentTickets.length} vé sự cố`}
                                    sx={{ fontWeight: 700 }}
                                />
                            }
                        >
                            <TableContainer
                                sx={{
                                    border: '1px solid var(--palette-divider)',
                                    borderRadius: '12px',
                                    overflow: 'auto',
                                }}
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Ảnh</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{TICKET_NUMBERS_LABEL}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Ngày xổ</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Mệnh giá</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Lý do sự cố</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Vé thay thế</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Chi tiết</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {incidentTickets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        Không có vé sự cố
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            incidentTickets.map((t) => {
                                                const isRefundTicket = refundOnlyTickets.some(
                                                    (r) => r.id === t.id
                                                );
                                                const candidates =
                                                    t.id != null
                                                        ? availableReplacements[t.id] || []
                                                        : [];
                                                const replacement = t.newTicketId
                                                    ? candidates.find(
                                                          (c: any) =>
                                                              c.id === t.newTicketId ||
                                                              c.ticketId === t.newTicketId ||
                                                              c.lotteryTicketId === t.newTicketId
                                                      )
                                                    : null;
                                                return (
                                                    <TableRow
                                                        key={t.id}
                                                        sx={{
                                                            bgcolor: isRefundTicket
                                                                ? 'var(--palette-warning-lighter)'
                                                                : 'transparent',
                                                        }}
                                                    >
                                                        <TableCell>
                                                            {t.ticketImg ? (
                                                                <Box
                                                                    component="img"
                                                                    src={t.ticketImg}
                                                                    alt={`Vé ${t.numbers}`}
                                                                    sx={{
                                                                        width: 48,
                                                                        height: 34,
                                                                        objectFit: 'contain',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid var(--palette-divider)',
                                                                        bgcolor: 'common.white',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 48,
                                                                        height: 34,
                                                                        borderRadius: '4px',
                                                                        bgcolor: 'action.hover',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.disabled"
                                                                    >
                                                                        —
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>
                                                            <Box>
                                                                <AdminLuckyDisplay value={t.numbers} ticket />
                                                                {t.serialNumber && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        component="div"
                                                                        sx={{
                                                                            mt: 0.25,
                                                                            lineHeight: 1.4,
                                                                            wordBreak: 'break-all',
                                                                        }}
                                                                    >
                                                                        {TICKET_SERIAL_PREFIX}: {t.serialNumber}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{t.stationName || '—'}</TableCell>
                                                        <TableCell>
                                                            {t.drawDate && t.drawDate !== '—'
                                                                ? dayjs(t.drawDate).format(
                                                                      'DD/MM/YYYY'
                                                                  )
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>
                                                            {new Intl.NumberFormat('vi-VN', {
                                                                style: 'currency',
                                                                currency: 'VND',
                                                            }).format(
                                                                Number(t.lineSubtotal) || 10000
                                                            )}
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
                                                                <Stack spacing={0.25}>
                                                                    <Chip
                                                                        size="small"
                                                                        color="success"
                                                                        label="Đã thay thế"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            height: 22,
                                                                            alignSelf: 'flex-start',
                                                                        }}
                                                                    />
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            fontFamily: 'monospace',
                                                                            color: 'text.secondary',
                                                                        }}
                                                                    >
                                                                        {replacement?.serialNumber ||
                                                                            replacement?.numbers ||
                                                                            `#${t.newTicketId}`}
                                                                    </Typography>
                                                                </Stack>
                                                            ) : (
                                                                <Chip
                                                                    size="small"
                                                                    color="warning"
                                                                    label="Hoàn tiền"
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        height: 22,
                                                                    }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 140 }}>
                                                            <Typography variant="body2">
                                                                {t.damagedReason || '—'}
                                                            </Typography>
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
                                                );
                                            })
                                        )}
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
                                            height: '100%',
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
                                            sx={{
                                                fontWeight: 800,
                                                color: 'var(--palette-warning-dark)',
                                            }}
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
                                            value={`${refundOnlyTickets.length} / ${incidentTickets.length} vé sự cố`}
                                        />
                                        <InfoField label="Loại hoàn tiền" value="Hoàn từng vé" />
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Stack spacing={2}>
                                        <InfoField
                                            label="Tài khoản nhận hoàn"
                                            value="Chưa có — khách sẽ cung cấp STK"
                                        />
                                        <InfoField
                                            label="Vé đã thay thế"
                                            value={`${
                                                incidentTickets.length - refundOnlyTickets.length
                                            } vé`}
                                        />
                                    </Stack>
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
                                    disabled={isSubmittingRefund}
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
                                                disabled={isSubmittingRefund}
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
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions
                    sx={{
                        p: 2.5,
                        px: 3,
                        gap: 1.5,
                        bgcolor: 'var(--palette-background-paper)',
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={() => setOpenRefundDialog(false)}
                        disabled={isSubmittingRefund}
                        sx={{
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
                        color="warning"
                        onClick={handleRefundSubmit}
                        disabled={
                            isSubmittingRefund ||
                            refundOnlyTickets.length === 0 ||
                            !refundReason.trim()
                        }
                        startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            boxShadow: 'none',
                        }}
                    >
                        {isSubmittingRefund ? 'Đang xử lý...' : 'Xác nhận & Tạo yêu cầu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {renderReplaceModal()}

            {reportFaultTicket && (
                <Dialog
                    open
                    onClose={() => setReportFaultTicket(null)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        className: 'admin-theme',
                        sx: { borderRadius: '16px', overflow: 'hidden' },
                    }}
                >
                    <DialogTitle component="div" sx={{ p: 2.5, pb: 2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'var(--palette-error-lighter)',
                                        color: 'var(--palette-error-dark)',
                                    }}
                                >
                                    <Icon icon="solar:danger-triangle-bold-duotone" width={22} />
                                </Box>
                                <Box>
                                    <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                        Báo lỗi vé
                                    </Typography>
                                    <Typography component="div" variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.8125rem' }}>
                                        Kho không còn vé thay thế — vé này sẽ được ghi nhận để hoàn tiền sau.
                                    </Typography>
                                </Box>
                            </Stack>
                            <IconButton onClick={() => setReportFaultTicket(null)} size="small" aria-label="Đóng">
                                <Icon icon="solar:close-circle-bold" />
                            </IconButton>
                        </Stack>
                    </DialogTitle>
                    <Divider />
                    <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: 'var(--palette-background-neutral, #f4f6f8)' }}>
                        {renderIncidentFormBody(reportFaultTicket, false)}
                    </DialogContent>
                    <Divider />
                    <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setReportFaultTicket(null)}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: 'text.secondary', borderColor: 'divider' }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleConfirmReportFault}
                            disabled={!!uploadingTicketIds[reportFaultTicket.id!]}
                            startIcon={<Icon icon="solar:danger-triangle-bold" width={18} />}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', boxShadow: 'none' }}
                        >
                            Xác nhận báo lỗi
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}
