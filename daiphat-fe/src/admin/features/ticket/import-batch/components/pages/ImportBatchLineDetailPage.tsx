"use client";

'use client';

import React from 'react';
import {
    IconButton,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Stack,
    CircularProgress,
    Grid,
    LinearProgress,
    Button,
    Checkbox,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    Dialog,
    DialogContent
} from '@mui/material';
import { AppToast } from '../../../../../../utils/toast.util';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@/components/router-compat';
import { QUERY_KEYS } from '../../../inventory/constants/queryKeys';
import { ReportSerialFaultPane } from '../sections/ReportSerialFaultPane';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LabelIcon from '@mui/icons-material/Label';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import { useImportBatchDetail } from '../../hooks/useImportBatch';
import { useStations } from '../../../../station/hooks/useStation';
import { useTicketInventory } from '../../../inventory/hooks/useTicketInventory';
import { getTicketStatusLabel, normalizeTicketStatus } from '../../../inventory/constants/ticket-status.config';
import { displayImportBatchLineCodeRaw, formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import { getBatchTypeColor, getBatchTypeLabel, getImportBatchLineStatusChipColor, getImportBatchLineStatusLabel } from '../../utils/batchTypeLabels';
import { ROUTES } from '../../../../../constants/routes';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import {
    buildCancelFlowStatusFilterOptions,
    getCancelFlowTicketStatusLabel,
    isTicketSelectableForCancel,
    matchesCancelFlowSerialFilter,
    matchesCancelFlowStatusFilter,
} from '../../utils/cancelTicketSelection';
import { isSerialIncidentEligible } from '../../utils/serialIncidentWorkflow';

const getTicketStatusBadgeClass = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    switch (normalized) {
        // Ticket aggregate statuses
        case 'IN_STOCK':
            return 'admin-status-badge--active';
        case 'IMPORTING':
            return 'admin-status-badge--pending';
        case 'SOLD_OUT':
        case 'EXPIRED':
            return 'admin-status-badge--inactive';
        // Serial statuses (nested rows reuse this helper)
        case 'SOLD':
            return 'admin-status-badge--success';
        case 'RESERVED':
        case 'PROXY_HOLDING':
            return 'admin-status-badge--pending';
        case 'DAMAGED':
        case 'LOST':
        case 'VOIDED':
            return 'admin-status-badge--inactive';
        default:
            // Unknown / legacy cached values
            return 'admin-status-badge--draft';
    }
};

const getSerialDisplayBadge = (serial: {
    status?: string | null;
    statusDisplayName?: string | null;
    ticketCondition?: string | null;
    ticketConditionDisplayName?: string | null;
}) => {
    const condition = (serial.ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED' || condition === 'LOST' || condition === 'VOIDED') {
        return {
            className: getTicketStatusBadgeClass(condition),
            label:
                serial.ticketConditionDisplayName ||
                (condition === 'DAMAGED' ? 'Hỏng' : condition === 'LOST' ? 'Thất lạc' : 'Đã hủy'),
        };
    }
    return {
        className: getTicketStatusBadgeClass(serial.status),
        label: serial.statusDisplayName || getTicketStatusLabel(serial.status) || serial.status || '—',
    };
};

const CollapsibleRow = ({ 
    ticket, 
    index, 
    cancelMode,
    selectedSerials,
    onSelectTicket,
    onSelectSerial
}: { 
    ticket: any; 
    index: number; 
    cancelMode: 'NONE' | 'TICKET' | 'SERIAL';
    selectedSerials: any[];
    onSelectTicket: (ticket: any, checked: boolean) => void;
    onSelectSerial: (ticket: any, serial: any, checked: boolean) => void;
}) => {
    const [open, setOpen] = React.useState(false);
    const ticketSelectable = isTicketSelectableForCancel(ticket.status);
    const statusLabel = getCancelFlowTicketStatusLabel(ticket.status, ticket.statusDisplayName || getTicketStatusLabel(ticket.status));

    const cancelableSerials = React.useMemo(() => {
        if (!ticketSelectable) {
            return [];
        }
        return (ticket.serials || []).filter((s: any) => isSerialIncidentEligible(s));
    }, [ticket.serials, ticketSelectable]);

    const cancelableCount = cancelableSerials.length;
    const selectedCount = React.useMemo(() => {
        return cancelableSerials.filter((s: any) => 
            selectedSerials.some(x => String(x.id) === String(s.id))
        ).length;
    }, [cancelableSerials, selectedSerials]);

    const isTicketChecked = cancelableCount > 0 && selectedCount === cancelableCount;
    const isTicketIndeterminate = selectedCount > 0 && selectedCount < cancelableCount;

    return (
        <React.Fragment>
            <TableRow 
                sx={{ 
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc' }, 
                    transition: 'background-color 0.15s ease'
                }}
            >
                <TableCell sx={{ width: 50, py: 1.5 }}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ width: 50, py: 1.5 }} align="center">
                    <Checkbox
                        size="small"
                        disabled={!ticketSelectable || cancelableCount === 0}
                        checked={isTicketChecked}
                        indeterminate={isTicketIndeterminate}
                        onChange={(e) => onSelectTicket(ticket, e.target.checked)}
                    />
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center" onClick={() => setOpen(!open)}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                        {index + 1}
                    </Typography>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ py: 1.5 }} onClick={() => setOpen(!open)}>
                    <Typography 
                        variant="body1" 
                        fontWeight={800} 
                        color="primary.main" 
                        sx={{ 
                            letterSpacing: '1px', 
                            fontSize: '1.1rem',
                            fontFamily: 'monospace'
                        }}
                    >
                        {ticket.numbers}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center" onClick={() => setOpen(!open)}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                        {ticket.quantity || (ticket.serials?.length ?? 0)}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} onClick={() => setOpen(!open)}>
                    <Typography variant="body2" color="text.secondary">
                        —
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }} align="center" onClick={() => setOpen(!open)}>
                    <span className={`admin-status-badge ${getTicketStatusBadgeClass(ticket.status)}`.trim()}>
                        {statusLabel}
                    </span>
                </TableCell>
            </TableRow>
            {open && ticket.serials && ticket.serials.length > 0 ? (
                ticket.serials.map((s: any, sIndex: number) => {
                    const serialBadge = getSerialDisplayBadge(s);
                    const isSerialChecked = selectedSerials.some(x => String(x.id) === String(s.id));

                    return (
                        <TableRow 
                            key={s.id} 
                            sx={{ 
                                bgcolor: '#f8fafc',
                                '&:hover': { bgcolor: '#f1f5f9' },
                                transition: 'background-color 0.15s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <TableCell sx={{ width: 50, py: 1 }} />
                            <TableCell sx={{ width: 50, py: 1 }} align="center">
                                <Checkbox
                                    size="small"
                                    checked={isSerialChecked}
                                    disabled={!ticketSelectable || !isSerialIncidentEligible(s)}
                                    onChange={(e) => onSelectSerial(ticket, s, e.target.checked)}
                                />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }} onClick={() => onSelectSerial(ticket, s, !isSerialChecked)}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {`${index + 1}.${sIndex + 1}`}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1, pl: 2 }} onClick={() => cancelMode === 'SERIAL' && onSelectSerial(ticket, s, !isSerialChecked)}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontFamily: 'monospace', 
                                        fontWeight: 600,
                                        color: '#334155'
                                    }}
                                >
                                    {s.serialNumber}
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }} onClick={() => cancelMode === 'SERIAL' && onSelectSerial(ticket, s, !isSerialChecked)}>
                                <Typography variant="body2" color="text.secondary">
                                    —
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }} onClick={() => cancelMode === 'SERIAL' && onSelectSerial(ticket, s, !isSerialChecked)}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {Number(ticket.priceSnapshot || 0).toLocaleString('vi-VN')} đ
                                </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }} onClick={() => cancelMode === 'SERIAL' && onSelectSerial(ticket, s, !isSerialChecked)}>
                                <span className={`admin-status-badge ${serialBadge.className}`.trim()} style={{ fontSize: '0.7rem', height: '1.25rem' }}>
                                    {serialBadge.label}
                                </span>
                            </TableCell>
                        </TableRow>
                    );
                })
            ) : open ? (
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ width: 50, py: 1 }} />
                    {cancelMode !== 'NONE' && <TableCell sx={{ width: 50, py: 1 }} />}
                    <TableCell colSpan={5} sx={{ py: 2, px: 4, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.825rem' }}>
                        Không có số sê-ri nào được gán
                    </TableCell>
                </TableRow>
            ) : null}
        </React.Fragment>
    );
};

export const ImportBatchLineDetailPage = () => {
    const { id, lineId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: batch, isLoading: isBatchLoading } = useImportBatchDetail(id);
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = (stationId: number) =>
        providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ||
        `Đài #${stationId}`;

    const line = batch?.lines?.find((l) => String(l.id) === String(lineId));

    const { tickets, isLoading: isTicketsLoading } = useTicketInventory({ 
        limit: 1000, 
        importBatchLineId: line?.id 
    });

    const [cancelMode, setCancelMode] = React.useState<'NONE' | 'TICKET' | 'SERIAL'>('NONE');
    const [selectedSerials, setSelectedSerials] = React.useState<any[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('ALL');
    const [quantityFilter, setQuantityFilter] = React.useState('ALL');

    const availableStatusFilterOptions = React.useMemo(
        () => buildCancelFlowStatusFilterOptions(tickets || []),
        [tickets]
    );

    React.useEffect(() => {
        if (
            statusFilter !== 'ALL' &&
            !availableStatusFilterOptions.some((option) => option.value === statusFilter)
        ) {
            setStatusFilter('ALL');
        }
    }, [availableStatusFilterOptions, statusFilter]);

    const filteredTickets = React.useMemo(() => {
        return (tickets || []).filter((ticket: any) => {
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const matchNumbers = (ticket.numbers || '').toLowerCase().includes(query);
                const matchSerials = (ticket.serials || []).some((s: any) => 
                    (s.serialNumber || '').toLowerCase().includes(query)
                );
                if (!matchNumbers && !matchSerials) return false;
            }

            if (statusFilter !== 'ALL') {
                const ticketStatusMatch = matchesCancelFlowStatusFilter(ticket.status, statusFilter);
                const serialStatusMatch = (ticket.serials || []).some((s: any) =>
                    matchesCancelFlowSerialFilter(s, statusFilter)
                );
                if (!ticketStatusMatch && !serialStatusMatch) return false;
            }

            const qty = ticket.quantity || ticket.serials?.length || 0;
            if (quantityFilter === '10' && qty !== 10) return false;
            if (quantityFilter === 'LESS_10' && (qty >= 10 || qty === 0)) return false;
            if (quantityFilter === 'ZERO' && qty !== 0) return false;

            return true;
        });
    }, [tickets, searchQuery, statusFilter, quantityFilter]);

    const cancelableSerials = React.useMemo(() => {
        const list: any[] = [];
        filteredTickets.forEach((ticket: any) => {
            if (!isTicketSelectableForCancel(ticket.status)) {
                return;
            }
            (ticket.serials || []).forEach((s: any) => {
                if (!isSerialIncidentEligible(s)) {
                    return;
                }
                list.push({
                    id: s.id,
                    serialNumber: s.serialNumber,
                    status: s.status,
                    ticketCondition: s.ticketCondition,
                    returnBatchLineId: s.returnBatchLineId,
                    ticketId: ticket.id,
                    ticketNumbers: ticket.numbers,
                    ticketStatus: ticket.status,
                    reservedByOrderId: s.reservedByOrderId,
                });
            });
        });
        return list;
    }, [filteredTickets]);

    const totalCancelableSerialsCount = cancelableSerials.length;
    const [isReportDialogOpen, setIsReportDialogOpen] = React.useState(false);
    const [dialogCancelMode, setDialogCancelMode] = React.useState<'TICKET' | 'SERIAL'>('TICKET');

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSerials(cancelableSerials);
        } else {
            setSelectedSerials([]);
        }
    };

    const handleSelectTicket = (ticket: any, checked: boolean) => {
        if (!isTicketSelectableForCancel(ticket.status)) {
            return;
        }
        const ticketSerialIds = (ticket.serials || [])
            .filter((s: any) => isSerialIncidentEligible(s))
            .map((s: any) => String(s.id));
        if (checked) {
            const cancelableOfTicket = (ticket.serials || [])
                .filter((s: any) => isSerialIncidentEligible(s))
                .map((s: any) => ({
                id: s.id,
                serialNumber: s.serialNumber,
                status: s.status,
                ticketCondition: s.ticketCondition,
                returnBatchLineId: s.returnBatchLineId,
                ticketId: ticket.id,
                ticketNumbers: ticket.numbers,
                reservedByOrderId: s.reservedByOrderId,
            }));
            
            setSelectedSerials(prev => {
                const filtered = prev.filter(x => !ticketSerialIds.includes(String(x.id)));
                return [...filtered, ...cancelableOfTicket];
            });
        } else {
            setSelectedSerials(prev => prev.filter(x => !ticketSerialIds.includes(String(x.id))));
        }
    };

    const handleSelectSerial = (ticket: any, serial: any, checked: boolean) => {
        if (!isTicketSelectableForCancel(ticket.status) || !isSerialIncidentEligible(serial)) {
            return;
        }
        if (checked) {
            setSelectedSerials(prev => {
                if (prev.some(x => String(x.id) === String(serial.id))) return prev;
                return [...prev, {
                    id: serial.id,
                    serialNumber: serial.serialNumber,
                    status: serial.status,
                    ticketCondition: serial.ticketCondition,
                    returnBatchLineId: serial.returnBatchLineId,
                    ticketId: ticket.id,
                    ticketNumbers: ticket.numbers,
                    reservedByOrderId: serial.reservedByOrderId,
                }];
            });
        } else {
            setSelectedSerials(prev => prev.filter(x => String(x.id) !== String(serial.id)));
        }
    };

    const handleCancelReport = () => {
        setIsReportDialogOpen(false);
    };

    const handleReportSuccess = () => {
        setIsReportDialogOpen(false);
        setSelectedSerials([]);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
    };

    if (isBatchLoading || !line || !batch) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    const stationName = resolveStationName(line.lotteryStationId);
    const completionRate = line.declareQuantity > 0 
        ? Math.round((line.totalQuantity / line.declareQuantity) * 100) 
        : 0;

    const firstSelected = selectedSerials[0];
    const reportTicketNumbers = firstSelected ? firstSelected.ticketNumbers : '';
    const reportTicketId = firstSelected ? firstSelected.ticketId : undefined;

    return (
        <Box sx={{ p: 3, bgcolor: '#faf9f5', minHeight: '100vh' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <IconButton 
                    onClick={() => id && navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(id))} 
                    size="small" 
                    sx={{ color: '#475569', bgcolor: '#fff', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f1f5f9' } }}
                >
                    <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Breadcrumb 
                    items={[
                        { label: 'Quản lý vé số' },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        { label: formatImportBatchHeaderCode((batch as any).importCode), to: id ? ROUTES.ADMIN.IMPORT_BATCH.DETAIL(id) : undefined },
                        { label: `Dòng lô ${displayImportBatchLineCodeRaw(line?.batchCode)}` }
                    ]} 
                />
            </Stack>

            <Paper 
                variant="outlined" 
                sx={{ 
                    p: 2.5, 
                    borderRadius: 3, 
                    borderColor: '#e2e8f0', 
                    bgcolor: '#fff',
                    mb: 2.5,
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
                    width: '100%'
                }}
            >
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <StorefrontIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Nhà đài
                                </Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                {stationName}
                            </Typography>
                        </Stack>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <LabelIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Loại lô
                                </Typography>
                            </Stack>
                            <Box sx={{ pl: 3 }}>
                                <Chip 
                                    label={getBatchTypeLabel(line.batchType)} 
                                    size="small" 
                                    color={getBatchTypeColor(line.batchType)}
                                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }} 
                                />
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <CheckCircleIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Trạng thái dòng
                                </Typography>
                            </Stack>
                            <Box sx={{ pl: 3 }}>
                                <Chip 
                                    label={getImportBatchLineStatusLabel(line.status)} 
                                    size="small" 
                                    color={getImportBatchLineStatusChipColor(line.status)}
                                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }} 
                                />
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <CalendarMonthIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Lịch quay
                                </Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <CloudUploadIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Ngày nhập
                                </Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ pl: 3 }}>
                                {line.importedAt ? dayjs(line.importedAt).format('DD/MM/YYYY HH:mm') : '—'}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                                <ShowChartIcon fontSize="small" sx={{ fontSize: '1rem', opacity: 0.8 }} />
                                <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Tiến độ nhập
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: 3 }}>
                                <Typography variant="body2" fontWeight={700} color="text.primary">
                                    {line.totalQuantity}/{line.declareQuantity} vé
                                </Typography>
                                <Box sx={{ width: 80, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: '100%' }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={completionRate} 
                                            color={completionRate === 100 ? 'success' : 'warning'} 
                                            sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9' }}
                                        />
                                    </Box>
                                    <Typography variant="caption" fontWeight={700} color={completionRate === 100 ? 'success.main' : 'warning.main'}>
                                        {completionRate}%
                                    </Typography>
                                </Box>
                            </Stack>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: 3.5, 
                width: '100%', 
                alignItems: 'stretch' 
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.25 }}>
                            <TextField
                                size="small"
                                placeholder="Tìm theo dãy số hoặc số sê-ri..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                                sx={{ 
                                    minWidth: 320, 
                                    width: { xs: '100%', sm: 340, md: 360 }, 
                                    bgcolor: '#fff',
                                    '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                                }}
                            />
                            <FormControl size="small" sx={{ width: 175, bgcolor: '#fff' }}>
                                <Select 
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)} 
                                    displayEmpty
                                    sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
                                >
                                    <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                                    {availableStatusFilterOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ width: 155, bgcolor: '#fff' }}>
                                <Select 
                                    value={quantityFilter} 
                                    onChange={(e) => setQuantityFilter(e.target.value)} 
                                    displayEmpty
                                    sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
                                >
                                    <MenuItem value="ALL">Tất cả số lượng</MenuItem>
                                    <MenuItem value="10">Đủ 10 vé</MenuItem>
                                    <MenuItem value="LESS_10">Dưới 10 vé</MenuItem>
                                    <MenuItem value="ZERO">0 vé</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Button 
                                variant="contained" 
                                color="error" 
                                size="small" 
                                startIcon={<ReportProblemIcon />} 
                                disabled={selectedSerials.length === 0}
                                onClick={() => {
                                    setIsReportDialogOpen(true);
                                }}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    boxShadow: 'none',
                                    py: 0.8,
                                    px: 2,
                                    '&.Mui-disabled': {
                                        bgcolor: '#f1f5f9',
                                        color: '#94a3b8',
                                        borderColor: '#cbd5e1'
                                    }
                                }}
                            >
                                Tiến hành hủy vé {selectedSerials.length > 0 && `(${selectedSerials.length})`}
                            </Button>
                        </Stack>
                    </Stack>

                    {isTicketsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
                            <CircularProgress size={36} thickness={4} />
                        </Box>
                    ) : filteredTickets.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#fff' }}>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                Không có vé số nào phù hợp với bộ lọc tìm kiếm.
                            </Typography>
                        </Paper>
                    ) : (
                        <TableContainer 
                            component={Paper} 
                            variant="outlined" 
                            sx={{ 
                                borderRadius: 2, 
                                borderColor: '#e2e8f0', 
                                boxShadow: 'none', 
                                bgcolor: '#fff', 
                                overflowY: 'auto',
                                flexGrow: 1,
                                height: '100%'
                            }}
                        >
                            <Table size="medium">
                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                    <TableRow>
                                        <TableCell sx={{ width: 50, py: 2 }} />
                                        <TableCell sx={{ width: 50, py: 2 }} align="center">
                                            <Checkbox
                                                indeterminate={
                                                    selectedSerials.length > 0 && 
                                                    selectedSerials.length < totalCancelableSerialsCount
                                                }
                                                checked={
                                                    totalCancelableSerialsCount > 0 && 
                                                    selectedSerials.length === totalCancelableSerialsCount
                                                }
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, py: 2, color: '#475569', width: 60 }} align="center">STT</TableCell>
                                        <TableCell sx={{ fontWeight: 700, py: 2, color: '#475569' }}>Dãy số nổi bật</TableCell>
                                        <TableCell sx={{ fontWeight: 700, py: 2, color: '#475569' }} align="center">Số lượng</TableCell>
                                        <TableCell sx={{ fontWeight: 700, py: 2, color: '#475569' }}>Giá bán</TableCell>
                                        <TableCell sx={{ fontWeight: 700, py: 2, color: '#475569' }} align="center">Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTickets.map((ticket: any, index: number) => (
                                        <CollapsibleRow 
                                            key={ticket.id} 
                                            ticket={ticket} 
                                            index={index} 
                                            cancelMode={dialogCancelMode}
                                            selectedSerials={selectedSerials}
                                            onSelectTicket={handleSelectTicket}
                                            onSelectSerial={handleSelectSerial}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Box>

            {/* Modal Dialog Pop-up for Fault Reporting */}
            <Dialog
                open={isReportDialogOpen}
                onClose={handleCancelReport}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        p: 3,
                        maxHeight: '90vh',
                        height: '90vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        bgcolor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <ReportSerialFaultPane
                        serials={selectedSerials}
                        ticketNumbers={reportTicketNumbers}
                        ticketId={reportTicketId}
                        importBatchLineId={line.id}
                        stationId={line.lotteryStationId}
                        drawDate={batch.drawDate}
                        defaultCancelMode={dialogCancelMode}
                        onCancel={handleCancelReport}
                        onSuccess={handleReportSuccess}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};
