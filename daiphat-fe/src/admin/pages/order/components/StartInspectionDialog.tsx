import React, { useEffect, useMemo, useState } from 'react';
import { getTickets } from '../../../api/ticket.api';
import { toast } from 'react-toastify';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Collapse,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText,
    IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { resolveOrderDetailStatusBadge } from '../../../../types/order.type';
import {
    resolveOrderDetailTicketDisplay,
    IncidentTicketDisplay,
} from '../constants/incidentTicket.constants';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../../../constants/routes';

interface StartInspectionDialogProps {
    open: boolean;
    onClose: () => void;
    orderCode?: string;
    orderId: string;
    orderDetails: any[];
    onSuccess?: () => void;
    onMoveToReadyForPickup?: () => void;
}

interface TicketReplacementState {
    newTicketId?: number;
    faultedBy: 'DAMAGED' | 'LOST' | '';
    damagedReason: string;
    damagedEvidenceUrl: string;
}

export function StartInspectionDialog({
    open,
    onClose,
    orderCode,
    orderId,
    orderDetails,
    onSuccess,
    onMoveToReadyForPickup,
}: StartInspectionDialogProps) {
    const navigate = useNavigate();
    const [isIncidentMode, setIsIncidentMode] = useState(false);
    const [replacementAvailability, setReplacementAvailability] = useState<Record<number, boolean>>({});
    const [replacements, setReplacements] = useState<Record<number, TicketReplacementState>>({});
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const tickets = useMemo(
        () => (orderDetails || []).map(resolveOrderDetailTicketDisplay),
        [orderDetails]
    );

    useEffect(() => {
        if (!open) return;
        setIsIncidentMode(false);
        setReplacements({});
        setExpandedRow(null);
        setReplacementAvailability({});
    }, [open, orderId]);

    useEffect(() => {
        if (!open || !isIncidentMode) return;
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
    }, [open, isIncidentMode, tickets]);

    const handleToggleIncidentMode = () => {
        setIsIncidentMode(prev => !prev);
        setReplacements({});
        setExpandedRow(null);
    };

    const handleReplaceTicketClick = (ticketId: number) => {
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
                    }
                }));
            }
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

    const hasAnyReplacement = Object.keys(replacements).length > 0;

    const handlePrimaryAction = () => {
        if (isIncidentMode && hasAnyReplacement) {
            // Navigate to refund create passing state
            navigate(`/${prefixAdmin}/refunds/create`, {
                state: {
                    orderId,
                    orderCode,
                    replacements,
                    orderDetails,
                }
            });
            onClose();
        } else {
            // Move to ready for pickup directly
            if (onMoveToReadyForPickup) {
                onMoveToReadyForPickup();
            }
            onClose();
        }
    };

    const renderReplacementForm = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        const state = replacements[ticketId];
        if (!state) return null;

        return (
            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, borderBottom: 'none' }}>
                    <Collapse in={expandedRow === ticketId} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: 'var(--palette-background-neutral)', borderRadius: '0 0 12px 12px', mb: 2, border: '1px solid var(--palette-divider)', borderTop: 'none' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                                Thông tin thay vé
                            </Typography>
                            <Stack spacing={2}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Lý do (Faulted By)</InputLabel>
                                    <Select
                                        label="Lý do (Faulted By)"
                                        value={state.faultedBy}
                                        onChange={(e) => updateReplacement(ticketId, 'faultedBy', e.target.value)}
                                    >
                                        <MenuItem value="DAMAGED">Vé rách / Hư hỏng</MenuItem>
                                        <MenuItem value="LOST">Thất lạc</MenuItem>
                                    </Select>
                                </FormControl>
                                
                                {state.faultedBy && (
                                    <TextField 
                                        size="small" 
                                        label="Chi tiết lý do (Damaged Reason)" 
                                        fullWidth 
                                        value={state.damagedReason}
                                        onChange={(e) => updateReplacement(ticketId, 'damagedReason', e.target.value)}
                                        placeholder="Nhập chi tiết sự cố..."
                                    />
                                )}

                                {state.faultedBy && state.faultedBy !== 'LOST' && (
                                    <TextField 
                                        size="small" 
                                        label="URL Minh chứng (Damaged Evidence)" 
                                        fullWidth 
                                        value={state.damagedEvidenceUrl}
                                        onChange={(e) => updateReplacement(ticketId, 'damagedEvidenceUrl', e.target.value)}
                                        placeholder="Nhập link ảnh minh chứng..."
                                    />
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
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
            </DialogTitle>

            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
                {isIncidentMode && (
                    <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px' }}>
                        Chế độ Xử lý sự cố đang bật. Hãy chọn Thay vé cho các vé bị lỗi. 
                        Các vé không thể thay thế sẽ được hoàn tiền tự động khi tạo yêu cầu.
                    </Alert>
                )}

                <Stack spacing={2.5}>
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Danh sách vé trong đơn
                            </Typography>
                            <Button 
                                size="small" 
                                color={isIncidentMode ? "error" : "warning"} 
                                variant={isIncidentMode ? "contained" : "outlined"}
                                onClick={handleToggleIncidentMode}
                                startIcon={<Icon icon="solar:danger-triangle-bold-duotone" />}
                                sx={{ textTransform: 'none', borderRadius: '8px', boxShadow: 'none' }}
                            >
                                {isIncidentMode ? "Hủy chế độ Xử lý sự cố" : "Xử lý sự cố"}
                            </Button>
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
                                        <TableCell sx={{ fontWeight: 600 }}>Bộ số</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Ngày xổ</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                        {isIncidentMode && (
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Thao tác</TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isIncidentMode ? 5 : 4} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không có vé trong đơn
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {tickets.map((ticket) => {
                                        const disabled = !ticket.isIncidentEligible || ticket.id == null;
                                        const badge = resolveOrderDetailStatusBadge(ticket.status);
                                        const hasRep = ticket.id != null && replacementAvailability[ticket.id];
                                        const isReplacing = ticket.id != null && expandedRow === ticket.id;

                                        return (
                                            <React.Fragment key={ticket.id ?? ticket.numbers}>
                                                <TableRow
                                                    hover={!disabled}
                                                    sx={{ opacity: disabled ? 0.55 : 1 }}
                                                >
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
                                                    {isIncidentMode && (
                                                        <TableCell align="right">
                                                            {hasRep ? (
                                                                <Button
                                                                    size="small"
                                                                    variant={isReplacing ? "contained" : "outlined"}
                                                                    color="primary"
                                                                    onClick={() => ticket.id != null && handleReplaceTicketClick(ticket.id)}
                                                                    sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                >
                                                                    {isReplacing ? "Đóng" : "Thay vé"}
                                                                </Button>
                                                            ) : (
                                                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                                                        Hết vé thay thế
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        variant={isReplacing ? "contained" : "outlined"}
                                                                        color="error"
                                                                        onClick={() => ticket.id != null && handleReplaceTicketClick(ticket.id)}
                                                                        sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                    >
                                                                        {isReplacing ? "Đóng" : "Báo lỗi"}
                                                                    </Button>
                                                                </Stack>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                                {isIncidentMode && ticket.id != null && renderReplacementForm(ticket)}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: 'var(--palette-text-secondary)' }}
                >
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color={isIncidentMode ? "error" : "primary"}
                    startIcon={<Icon icon={isIncidentMode ? "solar:wallet-money-bold-duotone" : "solar:check-circle-bold-duotone"} />}
                    onClick={handlePrimaryAction}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        ...( !isIncidentMode && {
                            bgcolor: 'var(--palette-grey-800)', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                        })
                    }}
                >
                    {isIncidentMode ? 'Chuyển sang Chờ nhận vé & Tạo yêu cầu hoàn tiền' : 'Chuyển sang "Chờ nhận vé"'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
