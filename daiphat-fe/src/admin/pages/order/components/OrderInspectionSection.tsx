import React, { useEffect, useMemo, useState } from 'react';
import { getTickets } from '../../../api/ticket.api';
import { getReplacementCandidates, handleOrderTicketIncidents, updateOrderStatus, createPartialRefund } from '../../../api/order.api';
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
import { Icon } from '@iconify/react';
import { UploadFiles } from '../../../components/ui/UploadFiles';
import dayjs from 'dayjs';
import { resolveOrderDetailStatusBadge } from '../../../../types/order.type';
import {
    resolveOrderDetailTicketDisplay,
    IncidentTicketDisplay,
} from '../constants/incidentTicket.constants';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../../../constants/routes';

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
    orderCode,
    orderId,
    orderDetails,
    orderInfo,
    onSuccess,
    onCancel,
    onMoveToReadyForPickup,
}: OrderInspectionSectionProps) {
    const navigate = useNavigate();
    const [replacementAvailability, setReplacementAvailability] = useState<Record<number, boolean>>({});
    const [availableReplacements, setAvailableReplacements] = useState<Record<number, any[]>>({});
    const [replacements, setReplacements] = useState<Record<number, TicketReplacementState>>({});
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [openRefundDialog, setOpenRefundDialog] = useState(false);
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [selectedRefundReasonSuggestion, setSelectedRefundReasonSuggestion] = useState('');

    const tickets = useMemo(
        () => (orderDetails || []).map(resolveOrderDetailTicketDisplay),
        [orderDetails]
    );

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
        if (!ticket.id) return;
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
        setExpandedRow(null);
        setReplacementAvailability({});
        setAvailableReplacements({});
    }, [orderId]);

    useEffect(() => {
        tickets.forEach(ticket => {
            if (ticket.id != null) {
                loadReplacements(ticket);
            }
        });
    }, [tickets, orderId]);

    const handleReplaceTicketClick = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        if (expandedRow === ticketId) {
            setExpandedRow(null);
        } else {
            setExpandedRow(ticketId);
            if (!replacements[ticketId]) {
                setReplacements(prev => ({
                    ...prev,
                    [ticketId]: {
                        faultedBy: '',
                        damagedReason: '',
                        damagedEvidenceUrl: '',
                        damagedEvidenceFiles: [],
                    }
                }));
            }
        }
    };

    const handleCancelReplacement = (ticketId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setReplacements(prev => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
        if (expandedRow === ticketId) {
            setExpandedRow(null);
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
        if (!state.damagedReason) return false;

        const candidates = availableReplacements[Number(ticketId)];
        const hasRep = candidates && candidates.length > 0;
        // Có tồn kho thay thế → bắt buộc chọn vé thay thế (không hoàn tiền).
        if (hasRep && !state.newTicketId) return false;

        // Nếu báo lỗi là Vé rách (DAMAGED) thì bắt buộc phải có ảnh minh chứng và phải upload thành công
        if (state.faultedBy === 'DAMAGED') {
            if (!state.damagedEvidenceFiles || state.damagedEvidenceFiles.length === 0) return false;
            const hasUnuploadedFiles = state.damagedEvidenceFiles.some((f: any) => f instanceof File);
            if (hasUnuploadedFiles) return false;
        }

        return true;
    });

    const hasAnyReplacement = Object.keys(replacements).length > 0;

    /**
     * Refund chỉ cần khi kết quả kiểm tra cuối cùng còn vé không thể fulfil
     * (hết tồn / báo lỗi mà không chọn được vé thay thế).
     * Chỉ mở form "Thay vé" hoặc chọn lý do khi vẫn còn tồn thay thế → KHÔNG tính là cần hoàn tiền.
     */
    const requiresRefund = Object.entries(replacements).some(([ticketId, state]) => {
        if (state.newTicketId) return false;
        const candidates = availableReplacements[Number(ticketId)];
        if (candidates === undefined) return false; // đang tải tồn kho
        return candidates.length === 0;
    });

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

            toast.success('Đã tạo yêu cầu hoàn tiền và cập nhật đơn hàng thành công');
            setOpenRefundDialog(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu hoàn tiền');
        } finally {
            setIsSubmittingRefund(false);
        }
    };


    const handlePrimaryAction = async () => {
        if (requiresRefund) {
            // Có ít nhất một vé không thay thế được → dialog tạo yêu cầu hoàn tiền
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
                    // Backend swaps serials and moves to PENDING_PICKUP; no refund when all replaced.
                    await createPartialRefund(orderId, { incidents });
                    toast.success('Đã đổi vé và chuyển sang chờ nhận vé thành công');
                    if (onSuccess) onSuccess();
                    return;
                }
                // No incident replacements — just move status.
                if (onMoveToReadyForPickup) {
                    onMoveToReadyForPickup();
                }
                if (onSuccess) onSuccess();
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xử lý thay vé');
            }
        }
    };

    const renderReplacementForm = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        const state = replacements[ticketId];
        if (!state) return null;

        const hasReplacementCandidates = availableReplacements[ticketId] && availableReplacements[ticketId].length > 0;

        return (
            <TableRow>
                <TableCell colSpan={7} sx={{ p: 0, borderBottom: 'none' }}>
                    <Collapse in={expandedRow === ticketId} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2.5, bgcolor: 'var(--palette-background-neutral)', borderRadius: '0 0 12px 12px', mb: 2, border: '1px solid var(--palette-divider)', borderTop: 'none' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                Xử lý sự cố cho vé: 
                                <Box component="span" sx={{ color: 'primary.main', bgcolor: 'primary.lighter', px: 1, py: 0.25, borderRadius: 1 }}>
                                    Bộ số {ticket.numbers}
                                </Box>
                                {ticket.serialNumber && (
                                    <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8em', fontWeight: 500, bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1 }}>
                                        SN: {ticket.serialNumber}
                                    </Box>
                                )}
                            </Typography>
                            
                            <Stack spacing={3}>
                                    <Stack 
                                        direction={{ xs: 'column', md: 'row' }} 
                                        spacing={4} 
                                        divider={hasReplacementCandidates ? <Divider orientation="vertical" flexItem /> : null}
                                        alignItems="flex-start"
                                    >
                                        {/* Reason & Details Column */}
                                        <Box sx={{ flex: 1, width: '100%' }}>
                                            <Stack spacing={2}>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                        Lý do báo lỗi (Faulted By)
                                                    </Typography>
                                                    <ToggleButtonGroup
                                                        color="primary"
                                                        value={state.faultedBy}
                                                        exclusive
                                                        onChange={(e, value) => {
                                                            if (value !== null) {
                                                                updateReplacement(ticketId, 'faultedBy', value);
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
                                                            }
                                                        }}
                                                    >
                                                        <ToggleButton value="DAMAGED">Vé rách / Hư hỏng</ToggleButton>
                                                        <ToggleButton value="LOST">Thất lạc</ToggleButton>
                                                    </ToggleButtonGroup>
                                                </Box>

                                                {state.faultedBy && (
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                            Chi tiết lý do
                                                        </Typography>
                                                        <TextField 
                                                            size="small" 
                                                            fullWidth 
                                                            multiline
                                                            minRows={state.faultedBy === 'LOST' ? 3 : 2}
                                                            value={state.damagedReason}
                                                            onChange={(e) => updateReplacement(ticketId, 'damagedReason', e.target.value)}
                                                            placeholder="Nhập chi tiết sự cố..."
                                                        />
                                                        {quickReasons[state.faultedBy] && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                                {quickReasons[state.faultedBy].map(reason => (
                                                                    <Typography 
                                                                        key={reason}
                                                                        variant="caption"
                                                                        onClick={() => updateReplacement(ticketId, 'damagedReason', reason)}
                                                                        sx={{ 
                                                                            cursor: 'pointer', 
                                                                            px: 1, 
                                                                            py: 0.5, 
                                                                            bgcolor: 'action.hover', 
                                                                            borderRadius: 1, 
                                                                            border: '1px solid var(--palette-divider)',
                                                                            '&:hover': { bgcolor: 'action.selected' }
                                                                        }}
                                                                    >
                                                                        {reason}
                                                                    </Typography>
                                                                ))}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}

                                                {state.faultedBy === 'DAMAGED' && (
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                            Ảnh minh chứng
                                                        </Typography>
                                                        <UploadFiles 
                                                            compact
                                                            files={state.damagedEvidenceFiles || []}
                                                            onFilesChange={(files) => {
                                                                updateReplacement(ticketId, 'damagedEvidenceFiles', files);
                                                                const url = files.find(f => typeof f === 'string');
                                                                updateReplacement(ticketId, 'damagedEvidenceUrl', url || '');
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>

                                        {/* Replacement Column */}
                                        {hasReplacementCandidates && (
                                            <Box sx={{ flex: 1, width: '100%' }}>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                        Chọn vé thay thế
                                                    </Typography>
                                                    <Autocomplete
                                                        fullWidth
                                                        options={availableReplacements[ticketId] || []}
                                                        getOptionLabel={(option) => `Bộ số: ${ticket.numbers} - SN: ${option.serialNumber}`}
                                                        value={availableReplacements[ticketId]?.find(t => t.id === state.newTicketId) || null}
                                                        onChange={(_, newValue) => updateReplacement(ticketId, 'newTicketId', newValue?.id)}
                                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                                        renderInput={(params) => (
                                                            <TextField 
                                                                {...params} 
                                                                size="small"
                                                                placeholder={availableReplacements[ticketId] ? "Tìm và chọn vé thay thế..." : "Đang tải..."} 
                                                            />
                                                        )}
                                                        renderOption={(props, option) => (
                                                            <li {...props} key={option.id} style={{ padding: '4px 8px' }}>
                                                                <Box sx={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: 2, 
                                                                    width: '100%',
                                                                    p: 1,
                                                                    borderRadius: 1,
                                                                }}>
                                                                    {option.ticketImg ? (
                                                                        <Box
                                                                            component="img"
                                                                            src={option.ticketImg}
                                                                            alt={`Vé ${ticket.numbers}`}
                                                                            sx={{
                                                                                width: 50,
                                                                                height: 35,
                                                                                objectFit: 'contain',
                                                                                borderRadius: '4px',
                                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                                border: '1px solid var(--palette-divider)'
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Box sx={{ 
                                                                            width: 50, height: 35, borderRadius: '4px', 
                                                                            bgcolor: 'action.disabledBackground', border: '1px solid var(--palette-divider)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                        }}>
                                                                            <Typography variant="caption" color="text.disabled">No img</Typography>
                                                                        </Box>
                                                                    )}
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                                                Bộ số: {ticket.numbers}
                                                                            </Typography>
                                                                            <Box sx={{ 
                                                                                px: 1, py: 0.25, borderRadius: 1, 
                                                                                bgcolor: 'success.lighter', color: 'success.dark',
                                                                                fontSize: '0.65rem', fontWeight: 700
                                                                            }}>
                                                                                Sẵn sàng
                                                                            </Box>
                                                                        </Stack>
                                                                        {option.serialNumber && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                                                                                SN: {option.serialNumber}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                            </li>
                                                        )}
                                                        noOptionsText="Không có vé thay thế"
                                                    />
                                                </Box>
                                            </Box>
                                        )}
                                    </Stack>
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Card sx={{ borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
            <CardHeader
                title={
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
                            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                Bắt đầu kiểm tra
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                                Đơn {orderCode || orderId}
                            </Typography>
                        </Box>
                    </Stack>
                }
            />
            <Divider />
            <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Danh sách vé trong đơn
                            </Typography>
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
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Loại vé</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Giá</TableCell>
                                        <TableCell sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                        <TableCell align="right" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: 'none' }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không có vé trong đơn
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {tickets.map((ticket) => {
                                        const disabled = !ticket.isIncidentEligible || ticket.id == null;
                                        const badge = resolveOrderDetailStatusBadge(ticket.status);
                                        const candidates = ticket.id != null ? availableReplacements[ticket.id] : undefined;
                                        const isLoading = ticket.id != null && candidates === undefined;
                                        const hasRep = ticket.id != null && !isLoading && candidates.length > 0;
                                        const isReplacing = ticket.id != null && expandedRow === ticket.id;
                                        const hasStartedFilling = ticket.id != null && !!replacements[ticket.id]?.faultedBy;
                                        const hasReplaced = ticket.id != null && !!replacements[ticket.id]?.newTicketId;

                                        return (
                                            <React.Fragment key={ticket.id ?? ticket.numbers}>
                                                <TableRow
                                                    hover={!disabled}
                                                    sx={{ opacity: disabled ? 0.55 : 1, '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell align="center">
                                                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                                                            {ticket.ticketImg ? (
                                                                <Box
                                                                    component="img"
                                                                    src={ticket.ticketImg}
                                                                    alt={`Vé ${ticket.numbers}`}
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        objectFit: 'contain',
                                                                        borderRadius: '4px',
                                                                        bgcolor: 'rgba(0,0,0,0.02)',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                        border: '1px solid var(--palette-divider)'
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: '#ee1314', color: 'white' }}>
                                                                    <Icon icon="solar:ticket-bold-duotone" width={20} />
                                                                </Avatar>
                                                            )}
                                                            <Box sx={{ textAlign: 'left' }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                                    {ticket.numbers}
                                                                </Typography>
                                                                {ticket.serialNumber && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        SN: {ticket.serialNumber}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Stack>
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
                                                        <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                            {ticket.drawDate ? dayjs(ticket.drawDate).locale('vi').format('dddd') : 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {ticket.ticketType === '—' ? 'Vé thường' : ticket.ticketType}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                            {(ticket.price || 10000).toLocaleString('vi-VN')}đ
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: badge.color,
                                                                bgcolor: badge.bgcolor,
                                                                px: 1,
                                                                py: 0.5,
                                                                borderRadius: '6px',
                                                            }}
                                                        >
                                                            {badge.label}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                            {isLoading ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: 26, px: 2 }}>
                                                                    <CircularProgress size={16} />
                                                                </Box>
                                                            ) : hasRep ? (
                                                                <Button
                                                                    size="small"
                                                                    variant={isReplacing ? "contained" : (hasReplaced ? "contained" : "outlined")}
                                                                    color={hasReplaced && !isReplacing ? "success" : "primary"}
                                                                    onClick={() => ticket.id != null && handleReplaceTicketClick(ticket)}
                                                                    sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                >
                                                                    {isReplacing ? "Đóng" : (hasReplaced ? "Đã thay vé" : "Thay vé")}
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                                                        Hết vé thay thế
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        variant={isReplacing ? "contained" : (hasStartedFilling ? "contained" : "outlined")}
                                                                        color={hasStartedFilling && !isReplacing ? "warning" : "error"}
                                                                        onClick={() => ticket.id != null && handleReplaceTicketClick(ticket)}
                                                                        sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                    >
                                                                        {isReplacing ? "Đóng" : (hasStartedFilling ? "Đã báo lỗi" : "Báo lỗi")}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {/* Cancel Button */}
                                                            {ticket.id != null && replacements[ticket.id] && (
                                                                (replacements[ticket.id].faultedBy || replacements[ticket.id].newTicketId || replacements[ticket.id].damagedReason) ? (
                                                                    <IconButton 
                                                                        size="small" 
                                                                        color="error" 
                                                                        onClick={(e) => handleCancelReplacement(ticket.id!, e)}
                                                                        sx={{ p: 0.5, bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light', color: 'common.white' } }}
                                                                        title="Hủy thao tác"
                                                                    >
                                                                        <Icon icon="solar:close-circle-bold" fontSize={18} />
                                                                    </IconButton>
                                                                ) : null
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                                {ticket.id != null && renderReplacementForm(ticket)}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Stack>
            </CardContent>
            <Divider />
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                    onClick={onCancel}
                    variant="outlined"
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: 'var(--palette-text-secondary)', borderColor: 'var(--palette-divider)' }}
                >
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color={requiresRefund ? "warning" : "primary"}
                    startIcon={<Icon icon={requiresRefund ? "solar:wallet-money-bold-duotone" : "solar:check-circle-bold-duotone"} />}
                    onClick={handlePrimaryAction}
                    disabled={hasAnyReplacement && !isAllReplacementsValid}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        ...( !requiresRefund && {
                            bgcolor: 'var(--palette-grey-800)', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                        })
                    }}
                >
                    {requiresRefund ? 'Chuyển sang Chờ nhận vé & Tạo yêu cầu hoàn tiền' : 'Chuyển sang "Chờ nhận vé"'}
                </Button>
            </Box>

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
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Tạo yêu cầu hoàn tiền
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
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
                                            <TableCell sx={{ fontWeight: 600 }}>Bộ số</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Serial</TableCell>
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
                                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
                                                            {t.numbers}
                                                        </TableCell>
                                                        <TableCell
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            {t.serialNumber || '—'}
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
        </Card>
    );
}
