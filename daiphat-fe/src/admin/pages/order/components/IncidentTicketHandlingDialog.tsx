import { useEffect, useMemo, useState } from 'react';
import { getTickets } from '../../../api/ticket.api';
import { toast } from 'react-toastify';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormHelperText,
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
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { resolveOrderDetailStatusBadge } from '../../../../types/order.type';
import {
    INCIDENT_TICKET_REASONS,
    IncidentTicketReasonValue,
    resolveOrderDetailTicketDisplay,
} from '../constants/incidentTicket.constants';
import { useHandleOrderTicketIncidents } from '../hooks/useOrderManagement';

interface IncidentTicketHandlingDialogProps {
    open: boolean;
    onClose: () => void;
    orderCode?: string;
    orderId: string;
    orderDetails: any[];
    onSuccess?: () => void;
}

/**
 * Incident ticket handling during PREPARING — select tickets + reason, call replace API.
 */
export function IncidentTicketHandlingDialog({
    open,
    onClose,
    orderCode,
    orderId,
    orderDetails,
    onSuccess,
}: IncidentTicketHandlingDialogProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [reason, setReason] = useState<IncidentTicketReasonValue | ''>('');
    const [note, setNote] = useState('');
    const [submittedOnce, setSubmittedOnce] = useState(false);
    const incidentMutation = useHandleOrderTicketIncidents();

    const [replacementAvailability, setReplacementAvailability] = useState<Record<number, boolean>>({});

    const tickets = useMemo(
        () => (orderDetails || []).map(resolveOrderDetailTicketDisplay),
        [orderDetails]
    );

    const eligibleTickets = useMemo(
        () => tickets.filter((t) => t.id != null && t.isIncidentEligible),
        [tickets]
    );

    useEffect(() => {
        if (!open) return;
        setSelectedIds([]);
        setReason('');
        setNote('');
        setSubmittedOnce(false);
        setReplacementAvailability({});
    }, [open, orderId]);

    useEffect(() => {
        if (!open) return;
        tickets.forEach(ticket => {
            if (ticket.id != null && ticket.stationId && ticket.drawDate) {
                if (ticket.hasReplacement) {
                    setReplacementAvailability(prev => ({ ...prev, [ticket.id!]: true }));
                    return;
                }
                getTickets({
                    search: ticket.numbers,
                    stationId: ticket.stationId,
                    drawDate: ticket.drawDate,
                    status: 'active',
                    limit: 1
                }).then(res => {
                    const hasStock = (res.data?.pagination?.totalRecords || 0) > 0;
                    setReplacementAvailability(prev => ({ ...prev, [ticket.id!]: hasStock }));
                }).catch(() => {});
            }
        });
    }, [open, tickets]);

    const allEligibleSelected =
        eligibleTickets.length > 0
        && eligibleTickets.every((t) => selectedIds.includes(t.id!));

    const toggleAll = () => {
        if (allEligibleSelected) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(eligibleTickets.map((t) => t.id!));
    };

    const toggleOne = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const allTicketsSelected = tickets.length > 0 && selectedIds.length === tickets.length;

    const selectionError = submittedOnce && selectedIds.length === 0;
    const reasonError = submittedOnce && !reason;

    const handleSubmit = () => {
        setSubmittedOnce(true);
        if (selectedIds.length === 0 || !reason) {
            return;
        }

        incidentMutation.mutate(
            {
                orderId,
                data: {
                    orderDetailIds: selectedIds,
                    reason,
                    note: note.trim() || undefined,
                },
            },
            {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
            }
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '16px' },
            }}
        >
            <DialogTitle sx={{ pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'var(--palette-warning-lighter)',
                            color: 'var(--palette-warning-dark)',
                        }}
                    >
                        <Icon icon="solar:danger-triangle-bold-duotone" width={22} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                            Xử lý vé sự cố
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                            Đơn {orderCode || orderId} · Chỉ áp dụng khi đang chuẩn bị vé
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: '10px' }}>
                    Chọn các vé bị sự cố và lý do. Hệ thống sẽ ưu tiên tìm vé thay thế cùng bộ số;
                    nếu hết vé sẽ tạo yêu cầu hoàn tiền từng phần ở các bước tiếp theo.
                </Alert>

                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Vé trong đơn
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
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={allEligibleSelected}
                                                indeterminate={
                                                    selectedIds.length > 0 && !allEligibleSelected
                                                }
                                                onChange={toggleAll}
                                                disabled={eligibleTickets.length === 0}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Bộ số</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Ngày xổ</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Thay thế</TableCell>
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
                                        const checked = ticket.id != null && selectedIds.includes(ticket.id);
                                        const badge = resolveOrderDetailStatusBadge(ticket.status);
                                        return (
                                            <TableRow
                                                key={ticket.id ?? ticket.numbers}
                                                hover={!disabled}
                                                selected={checked}
                                                sx={{
                                                    opacity: disabled ? 0.55 : 1,
                                                    bgcolor: checked
                                                        ? 'var(--palette-warning-lighter)'
                                                        : undefined,
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => ticket.id != null && toggleOne(ticket.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {ticket.numbers}
                                                    </Typography>
                                                    {ticket.serialNumber && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            SN: {ticket.serialNumber}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{ticket.stationName}</TableCell>
                                                <TableCell>
                                                    {ticket.drawDate
                                                        ? dayjs(ticket.drawDate).format('DD/MM/YYYY')
                                                        : '—'}
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
                                                <TableCell>
                                                    {ticket.id != null && replacementAvailability[ticket.id] ? (
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="caption" sx={{ color: 'var(--palette-success-main)', fontWeight: 600 }}>
                                                                Có vé thay thế
                                                            </Typography>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toast.info('Tính năng tìm vé thay thế đang được phát triển');
                                                                }}
                                                                sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem' }}
                                                            >
                                                                Tìm vé thay thế
                                                            </Button>
                                                        </Stack>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                                            Hết vé thay thế
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {selectionError && (
                            <FormHelperText error sx={{ mt: 1, mx: 0 }}>
                                Vui lòng chọn ít nhất một vé sự cố
                            </FormHelperText>
                        )}
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <FormControl fullWidth error={reasonError} size="small">
                        <InputLabel id="incident-reason-label">Lý do sự cố</InputLabel>
                        <Select
                            labelId="incident-reason-label"
                            label="Lý do sự cố"
                            value={reason}
                            onChange={(e) => setReason(e.target.value as IncidentTicketReasonValue)}
                        >
                            {INCIDENT_TICKET_REASONS.map((item) => (
                                <MenuItem key={item.value} value={item.value}>
                                    {item.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {reasonError && (
                            <FormHelperText>Vui lòng chọn lý do sự cố</FormHelperText>
                        )}
                    </FormControl>

                    <TextField
                        label="Ghi chú thêm (tuỳ chọn)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        placeholder="Ví dụ: Vé bị ướt khi lấy từ tủ..."
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                >
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    startIcon={<Icon icon="solar:shield-warning-bold-duotone" />}
                    onClick={handleSubmit}
                    disabled={incidentMutation.isPending}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: 'none',
                    }}
                >
                    {incidentMutation.isPending ? 'Đang xử lý...' : (allTicketsSelected ? 'Báo sự cố & Hủy đơn' : 'Tiếp tục xử lý')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
