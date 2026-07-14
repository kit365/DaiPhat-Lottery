import React, { useEffect, useMemo, useState } from 'react';
import { getTickets } from '../../../api/ticket.api';
import { getReplacementCandidates } from '../../../api/order.api';
import { toast } from 'react-toastify';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
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
    CircularProgress
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

interface OrderInspectionSectionProps {
    orderCode?: string;
    orderId: string;
    orderDetails: any[];
    onSuccess?: () => void;
    onCancel?: () => void;
    onMoveToReadyForPickup?: () => void;
}

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
    onSuccess,
    onCancel,
    onMoveToReadyForPickup,
}: OrderInspectionSectionProps) {
    const navigate = useNavigate();
    const [replacementAvailability, setReplacementAvailability] = useState<Record<number, boolean>>({});
    const [availableReplacements, setAvailableReplacements] = useState<Record<number, any[]>>({});
    const [replacements, setReplacements] = useState<Record<number, TicketReplacementState>>({});
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const tickets = useMemo(
        () => (orderDetails || []).map(resolveOrderDetailTicketDisplay),
        [orderDetails]
    );

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

    const isAllReplacementsValid = Object.values(replacements).every(state => {
        if (!state.faultedBy) return false;
        if (state.faultedBy === 'DAMAGED') {
            return !!state.damagedReason && (state.damagedEvidenceFiles && state.damagedEvidenceFiles.length > 0);
        }
        if (state.faultedBy === 'LOST') {
            return !!state.damagedReason;
        }
        return true;
    });

    const hasAnyReplacement = Object.keys(replacements).length > 0;

    const quickReasons: Record<string, string[]> = {
        DAMAGED: ["Bị rách nát", "Mờ số / không đọc được mã", "Bị ướt / phai màu"],
        LOST: ["Không tìm thấy trong kho", "Mất mát không rõ lý do"]
    };

    const handlePrimaryAction = () => {
        if (hasAnyReplacement) {
            // Navigate to refund create passing state
            navigate(`/${prefixAdmin}/refunds/create`, {
                state: {
                    orderId,
                    orderCode,
                    replacements,
                    orderDetails,
                }
            });
            if (onSuccess) onSuccess();
        } else {
            // Move to ready for pickup directly
            if (onMoveToReadyForPickup) {
                onMoveToReadyForPickup();
            }
            if (onSuccess) onSuccess();
        }
    };

    const renderReplacementForm = (ticket: IncidentTicketDisplay) => {
        const ticketId = ticket.id!;
        const state = replacements[ticketId];
        if (!state) return null;

        const hasReplacementCandidates = availableReplacements[ticketId] && availableReplacements[ticketId].length > 0;

        return (
            <TableRow>
                <TableCell colSpan={6} sx={{ p: 0, borderBottom: 'none' }}>
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
                                                                                objectFit: 'cover',
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
                                        <TableCell sx={{ fontWeight: 600 }}>Bộ số</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Ngày xổ</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                            {isLoading ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: 26, px: 2 }}>
                                                                    <CircularProgress size={16} />
                                                                </Box>
                                                            ) : hasRep ? (
                                                                <Button
                                                                    size="small"
                                                                    variant={isReplacing ? "contained" : "outlined"}
                                                                    color="primary"
                                                                    onClick={() => ticket.id != null && handleReplaceTicketClick(ticket)}
                                                                    sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                >
                                                                    {isReplacing ? "Đóng" : "Thay vé"}
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                                                        Hết vé thay thế
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        variant={isReplacing ? "contained" : "outlined"}
                                                                        color="error"
                                                                        onClick={() => ticket.id != null && handleReplaceTicketClick(ticket)}
                                                                        sx={{ textTransform: 'none', py: 0.25, minWidth: 'auto', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                                                                    >
                                                                        {isReplacing ? "Đóng" : "Báo lỗi"}
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
                    color={hasAnyReplacement ? "warning" : "primary"}
                    startIcon={<Icon icon={hasAnyReplacement ? "solar:wallet-money-bold-duotone" : "solar:check-circle-bold-duotone"} />}
                    onClick={handlePrimaryAction}
                    disabled={hasAnyReplacement && !isAllReplacementsValid}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        ...( !hasAnyReplacement && {
                            bgcolor: 'var(--palette-grey-800)', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                        })
                    }}
                >
                    {hasAnyReplacement ? 'Chuyển sang Chờ nhận vé & Tạo yêu cầu hoàn tiền' : 'Chuyển sang "Chờ nhận vé"'}
                </Button>
            </Box>
        </Card>
    );
}
